/* EWOD Camera Calibration V1.7 — eight-point primary calibration
 * Four- or eight-point SVG -> displayed-camera homography + local image registration.
 * Calibration never changes hardware actuation.
 * V1.7: 8-point calibration replaces legacy 4-point UI; safe fallback to
 *       edge-only precision verification when reservoir auto-match templates
 *       cannot be captured near the frame border. Point 8 is lower center transport.
 * V1.6: optional 8-point normalized least-squares homography (4 corners, 2 middle, 2 upper rectangle),
 *       preserving existing four-point workflow and interactive adjustment.
 * V1.5: added independent left/right nudge buttons for fine horizontal alignment.
 * V1.4: added independent vertical/horizontal scaling and button nudges.
 * V1.3: interactive translation, scale, rotation and four-anchor perspective adjustment.
 */
(() => {
    "use strict";

    const STORAGE_KEY = "ewod.cameraCalibration.v1";
    const TRANSFER_KEY = "ewod.cameraCalibration.unsavedTransfer.v1";
    const LOCAL_STORAGE_KEY = "ewod.localElectrodeAlignment.v1";
    const SNAPSHOT_WIDTH = 480;
    const TEMPLATE_RADIUS = 22;
    const TEMPLATE_STEP = 2;
    const SEARCH_RADIUS = 37;
    const PRECISION_WIDTH = 960; // 2x landmark-matching detail

    function solveHomography(src, dst) {
        if (src.length !== 4 || dst.length !== 4) return null;
        const matrix = [];
        for (let i = 0; i < 4; i++) {
            const { x, y } = src[i];
            const { x: u, y: v } = dst[i];
            if (![x, y, u, v].every(Number.isFinite)) return null;
            matrix.push([x, y, 1, 0, 0, 0, -u*x, -u*y, u]);
            matrix.push([0, 0, 0, x, y, 1, -v*x, -v*y, v]);
        }
        for (let c = 0; c < 8; c++) {
            let pivot = c;
            for (let r = c + 1; r < 8; r++) {
                if (Math.abs(matrix[r][c]) > Math.abs(matrix[pivot][c])) pivot = r;
            }
            if (Math.abs(matrix[pivot][c]) < 1e-9) return null;
            [matrix[c], matrix[pivot]] = [matrix[pivot], matrix[c]];
            const divisor = matrix[c][c];
            for (let j = c; j <= 8; j++) matrix[c][j] /= divisor;
            for (let r = 0; r < 8; r++) {
                if (r === c) continue;
                const factor = matrix[r][c];
                for (let j = c; j <= 8; j++) matrix[r][j] -= factor * matrix[c][j];
            }
        }
        const h = matrix.map(row => row[8]);
        return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
    }

    // Normalized least-squares homography. Four point pairs still use the original
    // exact solver; eight pairs minimize total reprojection error with 8 unknowns.
    // Normalizing both planes prevents camera pixels from dominating small SVG units.
    function solveHomographyLS(src, dst) {
        if (src.length === 4 && dst.length === 4) return solveHomography(src,dst);
        if (src.length < 5 || dst.length !== src.length ||
            [...src,...dst].some(p=>![p.x,p.y].every(Number.isFinite))) return null;
        const normalize = points => {
            const n=points.length;
            const cx=points.reduce((v,p)=>v+p.x,0)/n;
            const cy=points.reduce((v,p)=>v+p.y,0)/n;
            const average=points.reduce((v,p)=>v+Math.hypot(p.x-cx,p.y-cy),0)/n;
            if(average < 1e-6) return null;
            const scale=Math.SQRT2/average;
            return {points:points.map(p=>({x:scale*(p.x-cx),y:scale*(p.y-cy)})),
                    T:[[scale,0,-scale*cx],[0,scale,-scale*cy],[0,0,1]],
                    inv:[[1/scale,0,cx],[0,1/scale,cy],[0,0,1]]};
        };
        const a=normalize(src), b=normalize(dst);
        if(!a || !b) return null;
        const normal=Array.from({length:8},()=>Array(9).fill(0));
        const addRow=(values,rhs)=>{
            for(let j=0;j<8;j++) {
                for(let k=0;k<8;k++) normal[j][k]+=values[j]*values[k];
                normal[j][8]+=values[j]*rhs;
            }
        };
        for(let i=0;i<src.length;i++) {
            const {x,y}=a.points[i],{x:u,y:v}=b.points[i];
            addRow([x,y,1,0,0,0,-u*x,-u*y],u);
            addRow([0,0,0,x,y,1,-v*x,-v*y],v);
        }
        for(let c=0;c<8;c++) {
            let pivot=c;
            for(let r=c+1;r<8;r++) if(Math.abs(normal[r][c])>Math.abs(normal[pivot][c])) pivot=r;
            if(Math.abs(normal[pivot][c])<1e-10) return null;
            [normal[c],normal[pivot]]=[normal[pivot],normal[c]];
            const z=normal[c][c];
            for(let j=c;j<=8;j++) normal[c][j]/=z;
            for(let r=0;r<8;r++) if(r!==c) {
                const v=normal[r][c];
                for(let j=c;j<=8;j++) normal[r][j]-=v*normal[c][j];
            }
        }
        const h=normal.map(row=>row[8]);
        const hn=[[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]];
        const matmul=(X,Y)=>X.map(row=>[0,1,2].map(j=>row.reduce((sum,v,k)=>sum+v*Y[k][j],0)));
        const H=matmul(b.inv,matmul(hn,a.T));
        const d=H[2][2];
        if(!Number.isFinite(d)||Math.abs(d)<1e-10) return null;
        return H.map(row=>row.map(v=>v/d));
    }

    function project(H, x, y) {
        const w = H[2][0]*x + H[2][1]*y + H[2][2];
        if (!Number.isFinite(w) || Math.abs(w) < 1e-9) return null;
        const px = (H[0][0]*x + H[0][1]*y + H[0][2]) / w;
        const py = (H[1][0]*x + H[1][1]*y + H[1][2]) / w;
        return Number.isFinite(px) && Number.isFinite(py) ? {x: px, y: py} : null;
    }

    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function init() {
        const video = document.getElementById("camera-feed");
        const overlay = document.querySelector("canvas.vision-overlay");
        const row = document.querySelector(".vision-control-row");
        const visionStatus = document.getElementById("vision-status");
        if (!video || !overlay || !row) {
            console.warn("Calibration controls: camera or vision panel not available.");
            return;
        }

        let H = null;
        let reference = null;
        let lastCameraPoints = null;
        let lastSvgPoints = null;
        let adjustSession = null; // Unsaved, preview-only manual alignment.
        let localEdits = {}; // Per-electrode display-space corrections, independent of the SVG/channel map.
        let localSession = null; // Preview edits only until Save Electrode Edits.
        let selectedLocalId = null;
        let localVersion = 0;
        window.ewodLocalAlignmentVersion = 0;
        window.ewodAlignmentQuality = {passed:false, reason:"Not checked this session"};
        window.ewodCalibrationReady = false;

        const panel = document.createElement("div");
        panel.className = "camera-calibration-tools";
        panel.innerHTML = `
          <button type="button" id="save-camera-calibration">Save Reference</button>
          <button type="button" id="auto-camera-calibration" disabled>Auto Calibrate</button>
          <button type="button" id="precision-camera-calibration" disabled>Precision Align + Check</button>
          <button type="button" id="restore-camera-calibration">Restore Reference</button>
          <button type="button" id="clear-camera-calibration">Reset Saved</button>
          <div class="ewod-manual-alignment" style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:5px 0;">
            <button type="button" id="ewod-adjust-overlay" disabled>Adjust Overlay</button>
            <button type="button" id="ewod-scale-down" disabled>Smaller −</button>
            <button type="button" id="ewod-scale-up" disabled>Larger +</button>
            <button type="button" id="ewod-nudge-up" disabled>Move ↑</button>
            <button type="button" id="ewod-nudge-down" disabled>Move ↓</button>
            <button type="button" id="ewod-nudge-left" disabled>Move ←</button>
            <button type="button" id="ewod-nudge-right" disabled>Move →</button>
            <button type="button" id="ewod-height-down" disabled>Shorter ↕</button>
            <button type="button" id="ewod-height-up" disabled>Taller ↕</button>
            <button type="button" id="ewod-width-down" disabled>Narrower ↔</button>
            <button type="button" id="ewod-width-up" disabled>Wider ↔</button>
            <button type="button" id="ewod-rotate-left" disabled>Rotate ↶</button>
            <button type="button" id="ewod-rotate-right" disabled>Rotate ↷</button>
            <button type="button" id="ewod-save-adjust" disabled>Save Alignment</button>
            <button type="button" id="ewod-cancel-adjust" disabled>Cancel Adjust</button>
          </div>
          <!-- Historical electrode fine-tuning controls retained hidden to avoid altering saved mappings or event wiring. -->
          <div class="ewod-per-electrode" hidden aria-hidden="true" style="display:none !important;">
            <strong style="width:100%;">Individual electrode alignment (camera overlay only)</strong>
            <button type="button" id="ewod-edit-electrodes" disabled>Edit Individual Electrodes</button>
            <select id="ewod-local-electrode" aria-label="Electrode to adjust" disabled><option value="">Select electrode…</option></select>
            <button type="button" id="ewod-local-left" disabled>← 2px</button>
            <button type="button" id="ewod-local-right" disabled>2px →</button>
            <button type="button" id="ewod-local-up" disabled>↑ 2px</button>
            <button type="button" id="ewod-local-down" disabled>2px ↓</button>
            <button type="button" id="ewod-local-narrow" disabled>Narrower</button>
            <button type="button" id="ewod-local-wide" disabled>Wider</button>
            <button type="button" id="ewod-local-short" disabled>Shorter</button>
            <button type="button" id="ewod-local-tall" disabled>Taller</button>
            <button type="button" id="ewod-local-reset" disabled>Reset Selected</button>
            <button type="button" id="ewod-local-save" disabled>Save Electrode Edits</button>
            <button type="button" id="ewod-local-cancel" disabled>Cancel Edits</button>
            <small id="ewod-local-hint" style="width:100%;">Select a path in the camera overlay or from the list, drag to adjust, then save. Never changes DropBot channels or the original SVG.</small>
          </div>
          <button type="button" id="ewod-restore-magenta" title="Load your saved magenta overlay without recalibrating">Restore Saved Magenta</button>
          <small id="ewod-adjust-hint" style="display:none;">Drag any empty camera area to move the entire magenta overlay, including up/down. Move ↑/↓/←/→ nudges by 4 camera pixels; Taller/Shorter changes only its height; Wider/Narrower changes only its width. Drag cyan 1–4 handles for perspective. Save only on an EMPTY chip; run Precision Align + Check afterward.</small>
          <button type="button" id="ewod-eight-calibration" style="margin:4px 0;">Calibrate 8 Points</button>
          <span id="camera-calibration-message" role="status" aria-live="polite">Calibrate 8 points on camera and SVG to start.</span>
        `;
        row.insertAdjacentElement("afterend", panel);
        const saveButton = panel.querySelector("#save-camera-calibration");
        const autoButton = panel.querySelector("#auto-camera-calibration");
        const resetButton = panel.querySelector("#clear-camera-calibration");
        const precisionButton = panel.querySelector("#precision-camera-calibration");
        const restoreButton = panel.querySelector("#restore-camera-calibration");
        const message = panel.querySelector("#camera-calibration-message");
        const adjustButton = panel.querySelector("#ewod-adjust-overlay");
        const scaleDownButton = panel.querySelector("#ewod-scale-down");
        const scaleUpButton = panel.querySelector("#ewod-scale-up");
        const nudgeUpButton = panel.querySelector("#ewod-nudge-up");
        const nudgeDownButton = panel.querySelector("#ewod-nudge-down");
        const nudgeLeftButton = panel.querySelector("#ewod-nudge-left");
        const nudgeRightButton = panel.querySelector("#ewod-nudge-right");
        const heightDownButton = panel.querySelector("#ewod-height-down");
        const heightUpButton = panel.querySelector("#ewod-height-up");
        const widthDownButton = panel.querySelector("#ewod-width-down");
        const widthUpButton = panel.querySelector("#ewod-width-up");
        const rotateLeftButton = panel.querySelector("#ewod-rotate-left");
        const rotateRightButton = panel.querySelector("#ewod-rotate-right");
        const saveAdjustButton = panel.querySelector("#ewod-save-adjust");
        const cancelAdjustButton = panel.querySelector("#ewod-cancel-adjust");
        const adjustHint = panel.querySelector("#ewod-adjust-hint");
        const eightButton = panel.querySelector("#ewod-eight-calibration");
        // Replace the legacy 4-point button in the native vision toolbar.
        // Its old handler remains detached for backward compatibility with
        // older saved calibrations; only the 8-point button is visible.
        const fourButton = Array.from(row.querySelectorAll("button"))
            .find(button => button.textContent.trim() === "Calibrate 4 Points");
        if (fourButton) fourButton.replaceWith(eightButton);
        else row.appendChild(eightButton);
        let eightSession = null;
        const localControls = {
            edit:panel.querySelector("#ewod-edit-electrodes"),
            select:panel.querySelector("#ewod-local-electrode"),
            save:panel.querySelector("#ewod-local-save"),
            cancel:panel.querySelector("#ewod-local-cancel"),
            reset:panel.querySelector("#ewod-local-reset"),
            restore:panel.querySelector("#ewod-restore-magenta"),
            hint:panel.querySelector("#ewod-local-hint")
        };
        const localNudges={
            "ewod-local-left":{dx:-2}, "ewod-local-right":{dx:2},
            "ewod-local-up":{dy:-2}, "ewod-local-down":{dy:2},
            "ewod-local-narrow":{sx:0.99}, "ewod-local-wide":{sx:1.01},
            "ewod-local-short":{sy:0.99}, "ewod-local-tall":{sy:1.01}
        };

        function report(text, kind = "info") {
            message.textContent = text;
            message.dataset.state = kind;
            if (visionStatus) visionStatus.textContent = text;
            console.log("EWOD calibration:", text);
        }

        function videoIdentity() {
            return video.srcObject?.getVideoTracks?.()[0]?.label || "";
        }

        // The camera is CSS-zoomed/panned while the canvas stays untransformed.
        // Camera clicks and previews are expressed in overlay (display) pixels.
        function transformSignature() {
            const computed = getComputedStyle(video);
            const styleOrigin = computed.transformOrigin.split(/\s+/);
            const width = video.clientWidth || video.getBoundingClientRect().width;
            const height = video.clientHeight || video.getBoundingClientRect().height;
            const originX = parseFloat(styleOrigin[0]) / Math.max(1, width);
            const originY = parseFloat(styleOrigin[1]) / Math.max(1, height);
            const zoom = Number(document.getElementById("camera-zoom")?.value || 1);
            return {
                width: video.videoWidth,
                height: video.videoHeight,
                camera: videoIdentity(),
                zoom,
                originX: Number.isFinite(originX) ? originX : 0.5,
                originY: Number.isFinite(originY) ? originY : 0.5
            };
        }

        function sameView(a, b) {
            return !!a && !!b && a.width === b.width && a.height === b.height &&
                a.camera === b.camera && Math.abs(a.zoom - b.zoom) < 0.005 &&
                Math.abs(a.originX - b.originX) < 0.005 &&
                Math.abs(a.originY - b.originY) < 0.005;
        }

        // Returns the region actually visible to the operator after CSS zoom/pan,
        // in the same pixel coordinates as a click on the untransformed overlay.
        function snapshot(requestWidth = SNAPSHOT_WIDTH, includeColor = false) {
            if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
                throw new Error("Start the camera and wait for a live image.");
            }
            const info = transformSignature();
            const width = requestWidth;
            const height = Math.round(width * info.height / info.width);
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d", {willReadFrequently: true});
            const z = info.zoom;
            const x = (1 - z) * info.originX * width;
            const y = (1 - z) * info.originY * height;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(video, x, y, width * z, height * z);
            const rgba = ctx.getImageData(0, 0, width, height).data;
            const gray = new Uint8Array(width * height);
            const silver = includeColor ? new Float32Array(width * height) : null;
            for (let i = 0; i < gray.length; i++) {
                const j = i * 4;
                gray[i] = Math.round(0.299 * rgba[j] + 0.587 * rgba[j+1] + 0.114 * rgba[j+2]);
                if (silver) {
                    // Silver has nearly equal R/G/B; green PCB has much lower red than green.
                    const neutral = (rgba[j] - rgba[j+1] + 50) / 44;
                    silver[i] = Math.max(0, Math.min(1, neutral));
                }
            }
            return { width, height, gray, silver, signature: info };
        }

        function templateOffsets() {
            const out = [];
            for (let dy = -TEMPLATE_RADIUS; dy <= TEMPLATE_RADIUS; dy += TEMPLATE_STEP) {
                for (let dx = -TEMPLATE_RADIUS; dx <= TEMPLATE_RADIUS; dx += TEMPLATE_STEP) {
                    out.push([dx, dy]);
                }
            }
            return out;
        }
        const offsets = templateOffsets();

        function extractTemplate(frame, fullPoint) {
            const x = Math.round(fullPoint.x * frame.width / frame.signature.width);
            const y = Math.round(fullPoint.y * frame.height / frame.signature.height);
            if (x < TEMPLATE_RADIUS + SEARCH_RADIUS ||
                x >= frame.width - TEMPLATE_RADIUS - SEARCH_RADIUS ||
                y < TEMPLATE_RADIUS + SEARCH_RADIUS ||
                y >= frame.height - TEMPLATE_RADIUS - SEARCH_RADIUS) {
                throw new Error("Reservoir landmark is too close to the image edge for auto alignment.");
            }
            const pixels = offsets.map(([dx,dy]) => frame.gray[(y+dy)*frame.width + x+dx]);
            const mean = pixels.reduce((sum,v) => sum+v, 0) / pixels.length;
            const variance = pixels.reduce((sum,v) => sum+(v-mean)**2, 0);
            if (Math.sqrt(variance / pixels.length) < 9) {
                throw new Error("A landmark lacks contrast. Choose a reservoir edge or adjust lighting, then calibrate again.");
            }
            return {x, y, pixels, mean, variance};
        }

        function matchTemplate(frame, template) {
            let best = {score: -Infinity, x: 0, y: 0};
            const n = offsets.length;
            for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
                for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
                    const x = template.x + dx, y = template.y + dy;
                    if (x < TEMPLATE_RADIUS || x >= frame.width - TEMPLATE_RADIUS ||
                        y < TEMPLATE_RADIUS || y >= frame.height - TEMPLATE_RADIUS) continue;
                    let sum=0, sumSq=0, sumCross=0;
                    for (let k = 0; k < n; k++) {
                        const [px, py] = offsets[k];
                        const v = frame.gray[(y+py)*frame.width + (x+px)];
                        sum += v;
                        sumSq += v*v;
                        sumCross += v*(template.pixels[k]-template.mean);
                    }
                    const variance = sumSq - sum*sum/n;
                    const score = variance > 1000 ?
                        sumCross / Math.sqrt(variance * template.variance) : -1;
                    if (score > best.score) best = {score, x, y};
                }
            }
            return best;
        }

        function validateGeometry(before, after) {
            const changes = [];
            for (let i = 0; i < before.length; i++) {
                for (let j = i+1; j < before.length; j++) {
                    const oldDist = distance(before[i], before[j]);
                    const newDist = distance(after[i], after[j]);
                    if (oldDist < 5 || Math.abs(newDist/oldDist - 1) > 0.12) return false;
                    changes.push(Math.abs(newDist/oldDist - 1));
                }
            }
            // Rigid camera + planar fixed-height chip: little relative stretching.
            return changes.length === 6;
        }

        // Align four matched reservoir patches using a rigid 2D transformation.
        // Unlike a fresh 8-DOF homography, this cannot arbitrarily stretch,
        // skew, or warp small electrodes when one template jitters.
        function fitRigid(before, after) {
            const n = before.length;
            if (n !== 4 || after.length !== n) return null;
            const mean = points => ({
                x: points.reduce((s,p) => s+p.x, 0)/n,
                y: points.reduce((s,p) => s+p.y, 0)/n
            });
            const a = mean(before), b = mean(after);
            let dot = 0, cross = 0;
            for (let i=0; i<n; i++) {
                const px=before[i].x-a.x, py=before[i].y-a.y;
                const qx=after[i].x-b.x, qy=after[i].y-b.y;
                dot += px*qx + py*qy;
                cross += px*qy - py*qx;
            }
            const angle = Math.atan2(cross,dot);
            if (!Number.isFinite(angle) || Math.abs(angle)>Math.PI/12) return null;
            const c=Math.cos(angle), sin=Math.sin(angle);
            const tx=b.x-c*a.x+sin*a.y;
            const ty=b.y-sin*a.x-c*a.y;
            const transform=p=>({x:c*p.x-sin*p.y+tx, y:sin*p.x+c*p.y+ty});
            const residuals=before.map((p,i)=>distance(transform(p),after[i]));
            const rms=Math.sqrt(residuals.reduce((v,e)=>v+e*e,0)/n);
            const maxResidual=Math.max(...residuals);
            return {c,sin,tx,ty,transform,rms,maxResidual,angle};
        }

        function applyRigidToReference(rigid, frame) {
            // Start from original manually verified geometry, not the result
            // of a previous Auto Calibrate. Avoid accumulating drift.
            const manualH = reference.baseH || solveHomographyLS(lastSvgPoints,reference.cameraPoints);
            if (!manualH) return null;
            const sx = frame.signature.width/frame.width;
            const sy = frame.signature.height/frame.height;
            // A = S * R * S^-1, where S converts snapshot -> full-frame px.
            const T=[
                [rigid.c, -rigid.sin*sx/sy, rigid.tx*sx],
                [rigid.sin*sy/sx, rigid.c, rigid.ty*sy],
                [0, 0, 1]
            ];
            const product=T.map(row=>[0,1,2].map(j=>row.reduce((sum,k,i)=>sum+k*manualH[i][j],0)));
            const denom=product[2][2];
            if (!Number.isFinite(denom) || Math.abs(denom)<1e-9) return null;
            return product.map(row=>row.map(v=>v/denom));
        }

        // ===== EDGE-BASED PRECISION REGISTRATION (software only) =====
        // Unlike landmark image correlation, this objective samples the actual
        // electrode/green-PCB transition along *all* available electrode edges.
        // It does NOT deform individual electrodes to make a visually pleasing fit.
        function buildContourSamples(H0, frame) {
            const paths = window.ewodElectrodePaths;
            if (!(paths instanceof Map) || paths.size < 4) throw new Error("SVG electrode paths not loaded.");
            const sx = frame.width / frame.signature.width;
            const sy = frame.height / frame.signature.height;
            const samples=[];
            for (const [electrodeId, path] of paths.entries()) {
                if (typeof path.getTotalLength !== "function") continue;
                const bbox=path.getBBox();
                // The broad upper silver area has a known shape discrepancy; it
                // is excluded from edge optimization, but still drawn for inspection.
                if (bbox.width > 75 || bbox.height > 23) continue;
                const length=path.getTotalLength();
                if (!Number.isFinite(length) || length < 0.1) continue;
                const count=Math.max(20, Math.min(100, Math.ceil(length * 1.2)));
                const contour=[];
                for (let j=0;j<count;j++) {
                    const p=path.getPointAtLength(length*j/count);
                    const q=projectElectrode(electrodeId,p.x,p.y,H0);
                    if (!q) continue;
                    contour.push({x:q.x*sx,y:q.y*sy});
                }
                if (contour.length < 12) continue;
                let area=0;
                for (let j=0;j<contour.length;j++) {
                    const a=contour[j], b=contour[(j+1)%contour.length];
                    area += a.x*b.y - b.x*a.y;
                }
                if (Math.abs(area) < 4) continue;
                const orientation=Math.sign(area);
                for (let j=0;j<contour.length;j++) {
                    const a=contour[j], b=contour[(j+1)%contour.length];
                    const tx=b.x-a.x,ty=b.y-a.y;
                    const len=Math.hypot(tx,ty);
                    if (len < 1.4) continue;
                    const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
                    if (mid.x<15 || mid.x>frame.width-15 || mid.y<15 || mid.y>frame.height-15)continue;
                    samples.push({x:mid.x,y:mid.y,nx:orientation*(-ty/len),ny:orientation*(tx/len)});
                }
            }
            if (samples.length<70) throw new Error(`Not enough projected electrode boundaries (${samples.length}).`);
            return samples;
        }

        function chroma(frame,x,y) {
            if(x<1 || y<1 || x>=frame.width-1 || y>=frame.height-1) return null;
            const x0=Math.floor(x), y0=Math.floor(y), ax=x-x0,ay=y-y0;
            const idx=y0*frame.width+x0;
            const a=frame.silver;
            return (1-ay)*((1-ax)*a[idx]+ax*a[idx+1]) +
                ay*((1-ax)*a[idx+frame.width]+ax*a[idx+frame.width+1]);
        }

        function edgeResponse(frame,s,tx,ty,angle) {
            const c=Math.cos(angle),sn=Math.sin(angle);
            const cx=frame.width/2,cy=frame.height/2;
            const x=c*(s.x-cx)-sn*(s.y-cy)+cx+tx;
            const y=sn*(s.x-cx)+c*(s.y-cy)+cy+ty;
            const nx=c*s.nx-sn*s.ny, ny=sn*s.nx+c*s.ny;
            const inside=chroma(frame,x+nx*2.4,y+ny*2.4);
            const outside=chroma(frame,x-nx*2.4,y-ny*2.4);
            return inside===null || outside===null ? null : inside-outside;
        }

        function edgeScore(frame,samples,tx,ty,angle) {
            let total=0,n=0;
            for (const s of samples) {
                const v=edgeResponse(frame,s,tx,ty,angle);
                if (v===null)continue;
                // Limit bright artifacts dominating the objective.
                total += Math.max(-0.8,Math.min(0.8,v));n++;
            }
            return n ? total/n : -1;
        }

        function edgeMetrics(frame,samples,tx,ty,angle) {
            let errors=[],strong=0;
            const c=Math.cos(angle),sn=Math.sin(angle);
            const cx=frame.width/2,cy=frame.height/2;
            for (const s of samples) {
                const x=c*(s.x-cx)-sn*(s.y-cy)+cx+tx;
                const y=sn*(s.x-cx)+c*(s.y-cy)+cy+ty;
                const nx=c*s.nx-sn*s.ny,ny=sn*s.nx+c*s.ny;
                let best=-1, offset=0;
                for(let d=-7;d<=7;d+=1) {
                    const ins=chroma(frame,x+nx*(d+1.8),y+ny*(d+1.8));
                    const out=chroma(frame,x+nx*(d-1.8),y+ny*(d-1.8));
                    if(ins===null || out===null)continue;
                    const score=ins-out;
                    if(score>best){best=score;offset=d;}
                }
                if (best>=0.32) {strong++;errors.push(Math.abs(offset));}
            }
            errors.sort((a,b)=>a-b);
            const nth=q=>errors.length ? errors[Math.min(errors.length-1,Math.floor(q*(errors.length-1)))] : Infinity;
            return {count:errors.length,total:samples.length,coverage:strong/samples.length,
                median:nth(0.5),p90:nth(0.9)};
        }

        function rigidPixelMatrix(frame,tx,ty,angle) {
            const c=Math.cos(angle),sn=Math.sin(angle);
            const cx=frame.signature.width/2,cy=frame.signature.height/2;
            const fx=frame.signature.width/frame.width,fy=frame.signature.height/frame.height;
            const dx=(cx-c*cx+sn*cy)+tx*fx;
            const dy=(cy-sn*cx-c*cy)+ty*fy;
            return [[c,-sn*fx/fy,dx],[sn*fy/fx,c,dy],[0,0,1]];
        }

        function multiply3(A,B) {
            return A.map(row=>[0,1,2].map(j=>row.reduce((acc,v,k)=>acc+v*B[k][j],0)));
        }

        // First recover the chip's current location with the four saved
        // landmarks. Then inspect all electrode boundaries at higher detail.
        // This makes Precision Align a single click even after modest PCB motion.
        function coarseForPrecision() {
            if(!reference || !lastSvgPoints)throw new Error("Save an empty-chip reference first.");
            const frame=snapshot();
            if(!sameView(reference.signature,frame.signature))
                throw new Error("Camera, resolution, zoom or pan changed.");
            const matches=reference.templates.map(t=>matchTemplate(frame,t));
            const scores=matches.map(m=>m.score);
            if(scores.some(v=>!Number.isFinite(v)||v<0.76))
                throw new Error("Reference reservoir matching uncertain; run 8-point calibration.");
            const initial=reference.templates.map(t=>({x:t.x,y:t.y}));
            const current=matches.map(t=>({x:t.x,y:t.y}));
            if(!validateGeometry(initial,current))throw new Error("Reservoir geometry inconsistent.");
            const rigid=fitRigid(initial,current);
            if(!rigid||rigid.rms>4||rigid.maxResidual>7)
                throw new Error("Reservoir positions disagree; use manual calibration.");
            const base=applyRigidToReference(rigid,frame);
            if(!base)throw new Error("Cannot recover rigid camera transform.");
            const newPoints=lastSvgPoints.map(p=>project(base,p.x,p.y));
            if(newPoints.some(p=>!p))throw new Error("Invalid mapped electrode geometry.");
            // Use the reference as the starting point each time. Never
            // refine an already refined transform: that would accumulate drift.
            displayProjection(base,newPoints,lastSvgPoints);
            return scores;
        }

        function precisionRegistration() {
            if(!H)throw new Error("Restore your saved reference or run Auto Calibrate first.");
            if(!reference || !sameView(reference.signature,transformSignature()))
                throw new Error("Saved camera, zoom or pan no longer matches.");
            const frame=snapshot(PRECISION_WIDTH,true);
            const samples=buildContourSamples(H,frame);
            const baseline=edgeScore(frame,samples,0,0,0);
            let best={tx:0,ty:0,angle:0,score:baseline};
            // Coarse-to-fine, constrained *rigid* search. No stretching of electrodes.
            for (const size of [5,2,1,0.5]) {
                const candidates=[];
                for(const dx of [-size,0,size])for(const dy of [-size,0,size])
                    for(const da of [-size/600,0,size/600])
                        candidates.push({tx:best.tx+dx,ty:best.ty+dy,angle:best.angle+da});
                const selected=candidates.reduce((win,p)=>{
                    if(Math.hypot(p.tx,p.ty)>15 || Math.abs(p.angle)>0.03)return win;
                    const score=edgeScore(frame,samples,p.tx,p.ty,p.angle);
                    return score>win.score ? {...p,score} : win;
                },best);
                best=selected;
            }
            if(!Number.isFinite(best.score) || best.score<0.055) {
                throw new Error(`Electrode edges are not distinguishable (edge score ${best.score.toFixed(2)}). Improve focus/lighting or use manual calibration.`);
            }
            const improved=best.score-baseline;
            const shift=Math.hypot(best.tx,best.ty);
            const doApply=!Object.keys(localEdits).length && improved>0.015 && (shift>0.6 || Math.abs(best.angle)>0.001);
            const metrics=edgeMetrics(frame,samples,doApply?best.tx:0,doApply?best.ty:0,doApply?best.angle:0);
            // Conservative acceptance: check a majority of physical electrode edges.
            const pass=metrics.coverage>=0.45 && metrics.median<=2 && metrics.p90<=5;
            let newH=H;
            if (doApply) {
                newH=multiply3(rigidPixelMatrix(frame,best.tx,best.ty,best.angle),H);
                const newCameraPoints=lastSvgPoints.map(p=>project(newH,p.x,p.y));
                if(newCameraPoints.some(p=>!p)) throw new Error("Precision update produced invalid projection.");
                displayProjection(newH,newCameraPoints,lastSvgPoints);
                saveState();
            } else {
                // Keep the updated coarse alignment across a refresh, too.
                saveState();
            }
            const state={passed:pass,medianPx960:metrics.median,p90Px960:metrics.p90,
                coverage:metrics.coverage,edgeScore:best.score,applied:doApply,
                rawWidth:frame.signature.width,at:new Date().toISOString()};
            window.ewodAlignmentQuality=state;
            window.ewodCalibrationReady=pass;
            const text=`${pass?"EDGE CHECK PASS":"EDGE CHECK NEEDS REVIEW"}: median ${metrics.median.toFixed(1)} px, p90 ${metrics.p90.toFixed(1)} px at ${PRECISION_WIDTH}px; ${Math.round(metrics.coverage*100)}% edges detected; ${doApply?"refined":Object.keys(localEdits).length?"local edits retained, global map unchanged":"no correction needed"}.`;
            report(text,pass?"good":"warning");
            return state;
        }

        // Detect subsequent SVG edits; older saved references remain readable.
        function electrodeGeometryFingerprint() {
            const paths=window.ewodElectrodePaths;
            if(!(paths instanceof Map))return null;
            let hash=2166136261;
            const keys=Array.from(paths.keys()).sort();
            for(const key of keys){
                const path=paths.get(key);
                const text=`${key}:${path.getAttribute("d")}:${path.getAttribute("data-channels")};`;
                for(let i=0;i<text.length;i++){
                    hash^=text.charCodeAt(i);
                    hash=Math.imul(hash,16777619);
                }
            }
            return `${keys.length}:${(hash>>>0).toString(16)}`;
        }

        function saveState() {
            const item = {version:1, H, reference,
                cameraPoints:lastCameraPoints, svgPoints:lastSvgPoints};
            localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
        }

        // Independently save the calibration mapping. Template-based automatic
        // repositioning needs a safe margin; precision edge verification does not.
        // Never bypass edge checks or claim Auto Calibrate works without 4 templates.
        function canAutoMatch() {
            return reference?.templates?.length === 4;
        }
        function captureSavedReference() {
            if (!H || ![4,8].includes(lastCameraPoints?.length) ||
                lastSvgPoints?.length !== lastCameraPoints.length)
                throw new Error("Complete four- or eight-point calibration first.");
            const frame = snapshot();
            let templates = [];
            let autoWarning = null;
            try {
                // Preserve the four-reservoir automatic matching when possible.
                templates = lastCameraPoints.slice(0,4).map(p => extractTemplate(frame, p));
            } catch(error) {
                if (!/too close to the image edge/.test(error.message)) throw error;
                // A legitimate near-edge calibration still needs to be saved.
                // It can be verified by the electrode-edge check at the fixed view,
                // but automatic chip relocation is not available.
                autoWarning = error.message;
            }
            reference = {signature:frame.signature, templates,
                autoWarning,
                geometryFingerprint:electrodeGeometryFingerprint(),
                baseH:cloneMatrix(H),
                cameraPoints:lastCameraPoints.map(p=>({...p}))};
            saveState();
            localStorage.removeItem(TRANSFER_KEY); // transfer no longer needed after successful save
            autoButton.disabled = !canAutoMatch();
            precisionButton.disabled = false;
            return {autoAvailable:canAutoMatch(),autoWarning};
        }
        function referenceSavedMessage(prefix) {
            if (canAutoMatch()) return `${prefix} Auto Calibrate is available; run Precision Align + Check.`;
            return `${prefix} Precision Align + Check is available (fixed chip/view). `+
                `Auto Calibrate is disabled because a reservoir landmark is too close to the image edge.`;
        }

        function refreshAdjustButtons() {
            const editing = !!adjustSession;
            adjustButton.disabled = editing || !!localSession || !H || !window.ewodProject;
            for (const button of [scaleDownButton,scaleUpButton,
                                  nudgeUpButton,nudgeDownButton,nudgeLeftButton,nudgeRightButton,
                                  heightDownButton,heightUpButton,widthDownButton,widthUpButton,
                                  rotateLeftButton,rotateRightButton,saveAdjustButton,cancelAdjustButton])
                button.disabled = !editing;
            adjustHint.style.display = editing ? "block" : "none";
            // Don't let reference/auto actions overwrite an unsaved edit.
            saveButton.disabled = editing;
            restoreButton.disabled = editing;
            autoButton.disabled = editing || !canAutoMatch() || !!Object.keys(localEdits).length;
            precisionButton.disabled = editing || !reference;
            resetButton.disabled = editing || !!localSession;
            refreshLocalButtons();
        }

        function cloneMatrix(matrix) { return matrix.map(row=>row.slice()); }
        function copyPoints(points) { return points.map(p=>({x:p.x,y:p.y})); }

        function drawAdjustHandles(ctx, canvas) {
            if (!adjustSession || ![4,8].includes(lastCameraPoints?.length)) return;
            const cssToCanvas = canvas.width / Math.max(1,canvas.getBoundingClientRect().width);
            const radius = 7 * cssToCanvas;
            ctx.save();
            for (let i=0;i<4;i++) {
                const p=lastCameraPoints[i];
                ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
                ctx.fillStyle="#00e5ff";ctx.fill();
                ctx.lineWidth=2*cssToCanvas;ctx.strokeStyle="#00343a";ctx.stroke();
                ctx.font=`bold ${12*cssToCanvas}px sans-serif`;
                ctx.fillStyle="#001b1f";ctx.textAlign="center";
                ctx.textBaseline="middle";ctx.fillText(String(i+1),p.x,p.y);
            }
            ctx.restore();
        }

        function screenToOverlay(event, canvas) {
            const r=canvas.getBoundingClientRect();
            return {x:(event.clientX-r.left)*canvas.width/r.width,
                    y:(event.clientY-r.top)*canvas.height/r.height};
        }

        // Keep the reference-point quadrilateral convex and consistently
        // ordered. Do not accept crossed points or a flipped homography.
        function validAnchors(points) {
            if (points.length !== 4 || points.some(p=>![p.x,p.y].every(Number.isFinite)))
                return false;
            const turns=[];
            for(let i=0;i<4;i++) {
                const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4];
                turns.push((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));
                if(distance(a,b)<12) return false;
            }
            return turns.every(t=>t>25) || turns.every(t=>t< -25);
        }

        function applyAdjustedMatrix(nextH) {
            if (!adjustSession || !nextH) return false;
            const svgPoints=lastSvgPoints;
            const points=svgPoints.map(p=>project(nextH,p.x,p.y));
            if (points.some(p=>!p) || !validAnchors(points.slice(0,4))) return false;
            const width=video.videoWidth,height=video.videoHeight;
            if(points.some(p=>p.x < -width*0.1 || p.x > width*1.1 ||
                              p.y < -height*0.1 || p.y > height*1.1)) return false;
            displayProjection(nextH,points,svgPoints);
            return true;
        }

        // All transforms act in CAMERA pixel coordinates and update H itself.
        // Horizontal and vertical scaling are independently anchored to the
        // center of the four working-reservoir landmarks, not the image origin.
        // This preserves a single projective mapping for every electrode.
        function transformOverlay({scaleX=1,scaleY=1,degrees=0,dx=0,dy=0}={}) {
            if (!adjustSession) return;
            const points=lastCameraPoints;
            const cx=points.slice(0,4).reduce((sum,p)=>sum+p.x,0)/4;
            const cy=points.slice(0,4).reduce((sum,p)=>sum+p.y,0)/4;
            const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
            const xx=c*scaleX, xy=-s*scaleY;
            const yx=s*scaleX, yy=c*scaleY;
            const transform=[[xx,xy,cx+dx-xx*cx-xy*cy],
                             [yx,yy,cy+dy-yx*cx-yy*cy],[0,0,1]];
            if (!applyAdjustedMatrix(multiply3(transform,H)))
                report("Adjustment would invalidate the electrode mapping.","warning");
        }

        function endManualAdjust(restoreOriginal) {
            const previous=adjustSession;
            if (!previous) return;
            adjustSession=null;
            if (restoreOriginal) {
                displayProjection(previous.startH,previous.startCameraPoints,
                                  previous.startSvgPoints);
                window.ewodAlignmentQuality=previous.startQuality;
                window.ewodCalibrationReady=previous.startReady;
            } else {
                // Repaint without editable handles; verification remains required.
                displayProjection(H,lastCameraPoints,lastSvgPoints);
            }
            refreshAdjustButtons();
        }

        function installAdjustCanvasEvents(canvas) {
            if (canvas.dataset.ewodAdjustEvents === "installed") return;
            canvas.dataset.ewodAdjustEvents = "installed";
            canvas.addEventListener("pointerdown", event => {
                if(!adjustSession || event.button !== 0) return;
                if(!sameView(adjustSession.signature,transformSignature())) {
                    report("View changed: cancel alignment and recalibrate.","warning"); return;
                }
                event.preventDefault();event.stopPropagation();
                const pos=screenToOverlay(event,canvas);
                const range=18*canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
                const anchors=copyPoints(lastCameraPoints.slice(0,4));
                const idx=anchors.findIndex(p=>distance(p,pos)<=range);
                adjustSession.drag={pointerId:event.pointerId,
                    kind:idx>=0 ? "anchor" : "move",index:idx,
                    origin:pos,startH:cloneMatrix(H),startAnchors:anchors};
                canvas.setPointerCapture(event.pointerId);
                canvas.style.cursor=idx>=0?"crosshair":"grabbing";
            });
            canvas.addEventListener("pointermove", event => {
                if(!adjustSession) return;
                const pos=screenToOverlay(event,canvas);
                const drag=adjustSession.drag;
                if(!drag || drag.pointerId !== event.pointerId) {
                    const range=18*canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
                    canvas.style.cursor=lastCameraPoints?.slice(0,4).some(p=>distance(p,pos)<=range)?"crosshair":"grab";
                    return;
                }
                event.preventDefault();event.stopPropagation();
                const dx=pos.x-drag.origin.x,dy=pos.y-drag.origin.y;
                let nextH;
                if(drag.kind==="move") {
                    nextH=multiply3([[1,0,dx],[0,1,dy],[0,0,1]],drag.startH);
                } else {
                    const anchors=copyPoints(drag.startAnchors);
                    anchors[drag.index].x+=dx;
                    anchors[drag.index].y+=dy;
                    if(!validAnchors(anchors)) return;
                    // Correct the existing 8-point fit in camera space, rather than
                    // discarding middle/rectangle information during handle dragging.
                    const delta=solveHomography(drag.startAnchors,anchors);
                    nextH=delta ? multiply3(delta,drag.startH) : null;
                }
                applyAdjustedMatrix(nextH);
            });
            const finishDrag=event=>{
                if(!adjustSession?.drag || adjustSession.drag.pointerId!==event.pointerId) return;
                event.preventDefault();event.stopPropagation();
                adjustSession.drag=null;
                if(canvas.hasPointerCapture(event.pointerId))
                    canvas.releasePointerCapture(event.pointerId);
                canvas.style.cursor="grab";
            };
            canvas.addEventListener("pointerup",finishDrag);
            canvas.addEventListener("pointercancel",finishDrag);
            canvas.addEventListener("click",event=>{
                if(adjustSession){event.preventDefault();event.stopPropagation();}
            });
        }

        adjustButton.addEventListener("click",()=>{
            if(!H || ![4,8].includes(lastSvgPoints?.length) || !window.ewodProject) {
                report("First complete or restore calibration.","warning");return;
            }
            if(reference && !sameView(reference.signature,transformSignature())) {
                report("Current camera view differs from saved reference. Recalibrate first.","warning");return;
            }
            if(window.ewodCalibrationMode || eightSession || localSession) {
                report("Finish the active calibration click sequence first.","warning");return;
            }
            adjustSession={startH:cloneMatrix(H),
                startCameraPoints:copyPoints(lastCameraPoints),
                startSvgPoints:copyPoints(lastSvgPoints),
                startQuality:window.ewodAlignmentQuality,
                startReady:window.ewodCalibrationReady,
                signature:transformSignature(),drag:null};
            displayProjection(H,lastCameraPoints,lastSvgPoints);
            refreshAdjustButtons();
            report("Adjust mode: drag to move, Move ↑/↓/←/→ to nudge, Taller/Shorter for height, Narrower/Wider for width, or drag cyan 1–4 handles. Save on an EMPTY chip.");
        });
        scaleDownButton.addEventListener("click",()=>transformOverlay({scaleX:0.99,scaleY:0.99}));
        scaleUpButton.addEventListener("click",()=>transformOverlay({scaleX:1.01,scaleY:1.01}));
        nudgeUpButton.addEventListener("click",()=>transformOverlay({dy:-4}));
        nudgeDownButton.addEventListener("click",()=>transformOverlay({dy:4}));
        nudgeLeftButton.addEventListener("click",()=>transformOverlay({dx:-4}));
        nudgeRightButton.addEventListener("click",()=>transformOverlay({dx:4}));
        heightDownButton.addEventListener("click",()=>transformOverlay({scaleY:0.99}));
        heightUpButton.addEventListener("click",()=>transformOverlay({scaleY:1.01}));
        widthDownButton.addEventListener("click",()=>transformOverlay({scaleX:0.99}));
        widthUpButton.addEventListener("click",()=>transformOverlay({scaleX:1.01}));
        rotateLeftButton.addEventListener("click",()=>transformOverlay({degrees:-0.25}));
        rotateRightButton.addEventListener("click",()=>transformOverlay({degrees:0.25}));
        cancelAdjustButton.addEventListener("click",()=>{
            endManualAdjust(true);
            report("Manual changes discarded. Previous mapping restored.");
        });
        saveAdjustButton.addEventListener("click",()=>{
            if(!adjustSession) return;
            if(!sameView(adjustSession.signature,transformSignature())) {
                report("Camera view changed; do not save. Cancel and recalibrate.","warning");return;
            }
            try {
                // This creates the SAME persistent reference as Save Reference,
                // with the corrected camera points. Only do it on an EMPTY chip.
                captureSavedReference();
                endManualAdjust(false);
                report(referenceSavedMessage("Manual alignment saved."),"good");
            } catch(error) {report(`Save Alignment failed: ${error.message}`,"warning");}
        });

        // LOCAL ELECTRODE ADJUSTMENT: stored in camera-overlay pixels, NOT SVG units.
        // No channel IDs, electrode paths or hardware control commands are modified.
        function currentLocalEdit(id) {
            return localEdits[id] || {dx:0,dy:0,sx:1,sy:1};
        }
        function projectElectrode(id,x,y,matrix=H) {
            if(!matrix) return null;
            const p=project(matrix,x,y);
            if(!p) return null;
            const edit=currentLocalEdit(id);
            if(!edit || (!edit.dx&&!edit.dy&&edit.sx===1&&edit.sy===1))return p;
            const path=window.ewodElectrodePaths?.get(id);
            if(!path) return p;
            const rect=path.getBBox();
            const center=project(matrix,rect.x+rect.width/2,rect.y+rect.height/2);
            if(!center) return p;
            return {x:center.x+(p.x-center.x)*edit.sx+edit.dx,
                    y:center.y+(p.y-center.y)*edit.sy+edit.dy};
        }
        function publishLocalEdits() {
            window.ewodProjectElectrode=(id,x,y)=>projectElectrode(id,x,y);
            window.ewodLocalAlignmentVersion=++localVersion;
        }
        function cloneLocalEdits(object) {
            return JSON.parse(JSON.stringify(object));
        }
        function localSignature() {
            return reference?.signature || transformSignature();
        }
        function saveLocalEdits() {
            if (!H || !reference || !sameView(reference.signature,transformSignature()))
                throw new Error("Save/restore a global reference for this camera view before saving electrode edits.");
            const item={version:1,geometryFingerprint:electrodeGeometryFingerprint(),
                signature:reference.signature,corrections:localEdits};
            localStorage.setItem(LOCAL_STORAGE_KEY,JSON.stringify(item));
        }
        function readLocalEdits() {
            const item=JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)||"null");
            if(!item || item.version!==1) return {};
            if(item.geometryFingerprint!==electrodeGeometryFingerprint() ||
               !sameView(item.signature,transformSignature()))
                throw new Error("Saved electrode edits belong to a different SVG or camera view. They were not applied.");
            const paths=window.ewodElectrodePaths;
            const safe={};
            for(const [id,edit] of Object.entries(item.corrections||{})) {
                if(!paths?.has(id) || ![edit.dx,edit.dy,edit.sx,edit.sy].every(Number.isFinite) ||
                   Math.abs(edit.dx)>100 || Math.abs(edit.dy)>100 ||
                   edit.sx<0.45 || edit.sx>1.6 || edit.sy<0.45 || edit.sy>1.6)continue;
                safe[id]={dx:edit.dx,dy:edit.dy,sx:edit.sx,sy:edit.sy};
            }
            return safe;
        }
        function fillLocalSelect() {
            const paths=window.ewodElectrodePaths;
            if(!(paths instanceof Map))return;
            if(localControls.select.options.length-1===paths.size)return;
            localControls.select.replaceChildren(new Option("Select electrode…",""));
            for (const [id,path] of paths) {
                const channel=path.getAttribute("data-channels")||"?";
                localControls.select.add(new Option(`${id} (channel ${channel})`,id));
            }
        }
        function refreshLocalButtons() {
            fillLocalSelect();
            const editing=!!localSession;
            localControls.edit.disabled=editing || !!adjustSession || !!eightSession || !H || !reference ||
                !sameView(reference.signature,transformSignature());
            localControls.select.disabled=!editing;
            const canChange=editing && !!selectedLocalId;
            for(const id of Object.keys(localNudges))panel.querySelector(`#${id}`).disabled=!canChange;
            localControls.reset.disabled=!canChange;
            localControls.save.disabled=!editing;
            localControls.cancel.disabled=!editing;
            localControls.restore.disabled=editing || !!adjustSession || !!eightSession;
            if(editing) localControls.select.value=selectedLocalId||"";
            if(!editing) localControls.hint.textContent="Select any electrode to fine-tune after global calibration; Save Electrode Edits persists after refresh. Restore Saved Magenta reloads your saved mapping.";
        }
        function localCanvasPoint(event, canvas) {
            const r=canvas.getBoundingClientRect();
            return {x:(event.clientX-r.left)*canvas.width/r.width,
                    y:(event.clientY-r.top)*canvas.height/r.height};
        }
        function localHitTest(p) {
            const paths=window.ewodElectrodePaths;
            if(!(paths instanceof Map))return null;
            let bestId=null,bestDistance=Infinity;
            for(const [id,path] of paths) {
                const len=path.getTotalLength();
                if(!(len>0))continue;
                const n=Math.max(25,Math.min(170,Math.ceil(len*3)));
                const poly=[];
                for(let i=0;i<n;i++) {
                    const v=path.getPointAtLength(len*i/n),q=projectElectrode(id,v.x,v.y);
                    if(q)poly.push(q);
                }
                if(poly.length<3)continue;
                let inside=false,near=Infinity;
                for(let i=0,j=poly.length-1;i<poly.length;j=i++){
                    const a=poly[j],b=poly[i];
                    if((a.y>p.y)!==(b.y>p.y) &&
                       p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
                    const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;
                    const t=l2?Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/l2)):0;
                    near=Math.min(near,Math.hypot(p.x-a.x-vx*t,p.y-a.y-vy*t));
                }
                if((inside||near<9) && near<bestDistance) {bestDistance=near;bestId=id;}
            }
            return bestId;
        }
        function repaintLocal() {
            if(H) displayProjection(H,lastCameraPoints,lastSvgPoints);
            else publishLocalEdits();
        }
        function localEditChange(delta) {
            if(!localSession || !selectedLocalId)return;
            const id=selectedLocalId,e={...currentLocalEdit(id)};
            e.dx=Math.max(-100,Math.min(100,e.dx+(delta.dx||0)));
            e.dy=Math.max(-100,Math.min(100,e.dy+(delta.dy||0)));
            e.sx=Math.max(0.45,Math.min(1.6,e.sx*(delta.sx||1)));
            e.sy=Math.max(0.45,Math.min(1.6,e.sy*(delta.sy||1)));
            localEdits[id]=e;
            repaintLocal();
            localControls.hint.textContent=`${id}: shift ${e.dx.toFixed(1)}, ${e.dy.toFixed(1)} pixels; size ${Math.round(e.sx*100)}% × ${Math.round(e.sy*100)}%. Save to keep corrections.`;
        }
        function clearLocalSession(rollback) {
            if(!localSession)return;
            if(rollback) localEdits=cloneLocalEdits(localSession.original);
            const old=localSession;
            localSession=null;
            selectedLocalId=null;
            if(rollback) {
                repaintLocal();
                window.ewodAlignmentQuality=old.quality;
                window.ewodCalibrationReady=old.ready;
            } else repaintLocal();
            refreshAdjustButtons();
        }
        // Capture-phase handlers intercept ONLY during per-electrode edit mode.
        // Normal electrode selection, camera calibration and global dragging are untouched.
        function installLocalCanvasEvents(canvas) {
            if(canvas.dataset.ewodLocalEvents==="installed")return;
            canvas.dataset.ewodLocalEvents="installed";
            canvas.addEventListener("pointerdown",event=>{
                if(!localSession)return;
                event.preventDefault();event.stopImmediatePropagation();
                const pos=localCanvasPoint(event,canvas);
                const id=localHitTest(pos);
                if(id) {
                    selectedLocalId=id;
                    localControls.select.value=id;
                    localSession.drag={pointerId:event.pointerId,id,origin:pos,
                        initial:{...currentLocalEdit(id)}};
                    canvas.setPointerCapture(event.pointerId);
                    localControls.hint.textContent=`Selected ${id}. Drag it, or use arrow/size buttons. Save when finished.`;
                } else localControls.hint.textContent="Click a magenta electrode (or use the list) to select it.";
                repaintLocal();refreshLocalButtons();
            },true);
            canvas.addEventListener("pointermove",event=>{
                if(!localSession?.drag || localSession.drag.pointerId!==event.pointerId)return;
                event.preventDefault();event.stopImmediatePropagation();
                const p=localCanvasPoint(event,canvas), drag=localSession.drag;
                const dx=p.x-drag.origin.x,dy=p.y-drag.origin.y;
                localEdits[drag.id]={...drag.initial,
                    dx:Math.max(-100,Math.min(100,drag.initial.dx+dx)),
                    dy:Math.max(-100,Math.min(100,drag.initial.dy+dy))};
                repaintLocal();
            },true);
            const end=event=>{
                if(!localSession?.drag || localSession.drag.pointerId!==event.pointerId)return;
                event.preventDefault();event.stopImmediatePropagation();
                localSession.drag=null;
                if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
            };
            canvas.addEventListener("pointerup",end,true);
            canvas.addEventListener("pointercancel",end,true);
            canvas.addEventListener("click",event=>{
                if(localSession){event.preventDefault();event.stopImmediatePropagation();}
            },true);
        }
        localControls.edit.addEventListener("click",()=>{
            if(!H||!reference || !sameView(reference.signature,transformSignature())){
                report("Restore and save your global calibration for this camera view first.","warning");return;
            }
            if(adjustSession || eightSession || window.ewodCalibrationMode) {
                report("Finish the other calibration mode first.","warning");return;
            }
            localSession={original:cloneLocalEdits(localEdits),
                quality:window.ewodAlignmentQuality,ready:window.ewodCalibrationReady,drag:null};
            selectedLocalId=null;
            repaintLocal();refreshAdjustButtons();
            report("Individual electrode editing: click or select a magenta electrode, drag or adjust it, then Save Electrode Edits.");
        });
        localControls.select.addEventListener("change",()=>{
            selectedLocalId=localControls.select.value || null;
            repaintLocal();refreshLocalButtons();
        });
        for(const [id,delta] of Object.entries(localNudges)) {
            panel.querySelector(`#${id}`).addEventListener("click",()=>localEditChange(delta));
        }
        localControls.reset.addEventListener("click",()=>{
            if(!localSession || !selectedLocalId)return;
            delete localEdits[selectedLocalId];repaintLocal();
            report(`Reset ${selectedLocalId} to the global calibration.`);
        });
        localControls.cancel.addEventListener("click",()=>{
            clearLocalSession(true);report("Individual edits cancelled. Previously saved mapping restored.");
        });
        localControls.save.addEventListener("click",()=>{
            if(!localSession)return;
            try {
                saveLocalEdits();
                clearLocalSession(false);
                report("Individual electrode corrections saved. They will be restored for the SAME camera view and SVG; run Precision Align + Check before Vision ON.","good");
            } catch(error) {report(`Save electrode edits failed: ${error.message}`,"warning");}
        });
        localControls.restore.addEventListener("click",()=>{
            if(localSession || adjustSession || eightSession)return;
            try {
                const item=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
                if(!item?.H || !item.reference) throw new Error("No saved global alignment. Save Reference on an empty chip first.");
                if(item.reference.geometryFingerprint &&
                   item.reference.geometryFingerprint!==electrodeGeometryFingerprint())
                    throw new Error("SVG geometry changed; saved magenta cannot be safely restored.");
                if(!sameView(item.reference.signature,transformSignature()) &&
                   !restoreSavedCameraView(item.reference.signature))
                    throw new Error("Saved mapping is for another camera, zoom or pan. Restore that view before loading.");
                reference=item.reference;
                localEdits=readLocalEdits();
                displayProjection(item.H,item.cameraPoints,item.svgPoints);
                autoButton.disabled = !canAutoMatch() || !!Object.keys(localEdits).length;
                precisionButton.disabled=false;
                report("Saved magenta overlay and local electrode edits restored. Only valid if physical camera and chip have not moved; run Precision Align + Check before tracking.","good");
            } catch(error) {report(`Restore failed: ${error.message}`,"warning");}
        });

        function displayProjection(newH, camPoints, svgPoints) {
            H = newH;
            window.ewodCalibrationReady = false;
            window.ewodAlignmentQuality = {passed:false,reason:"Geometry updated: precision verification needed"};
            lastCameraPoints = camPoints;
            lastSvgPoints = svgPoints;
            window.ewodHomography = H;
            window.ewodCameraCalibrationPoints = camPoints;
            window.ewodSvgCalibrationPoints = svgPoints;
            window.ewodProject = (x,y) => project(H,x,y);
            publishLocalEdits();
            window.ewodCalibrationViewSignature = transformSignature();
            precisionButton.disabled = !reference;

            // Old preview produced from the browser Console should not remain.
            document.getElementById("calibration-preview")?.remove();
            document.getElementById("ewod-calibration-preview")?.remove();
            let canvas = document.getElementById("ewod-auto-calibration-preview");
            if (!canvas) {
                canvas = document.createElement("canvas");
                canvas.id = "ewod-auto-calibration-preview";
                canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;";
                overlay.parentElement.appendChild(canvas);
            }
            installLocalCanvasEvents(canvas);
            installAdjustCanvasEvents(canvas);
            canvas.style.pointerEvents = (adjustSession || localSession) ? "auto" : "none";
            canvas.style.touchAction = (adjustSession || localSession) ? "none" : "auto";
            canvas.style.cursor = localSession ? "crosshair" : adjustSession ? "grab" : "default";
            canvas.width = overlay.width || video.videoWidth;
            canvas.height = overlay.height || video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 3;
            const paths = window.ewodElectrodePaths;
            let drawn = 0;
            if (paths instanceof Map) {
                for (const [electrodeId,path] of paths.entries()) {
                    if (typeof path.getTotalLength !== "function") continue;
                    const length = path.getTotalLength();
                    if (!(length > 0)) continue;
                    const samples = Math.max(30, Math.min(500, Math.ceil(length*2)));
                    ctx.beginPath();
                    let started = false;
                    for (let i = 0; i <= samples; i++) {
                        const p = path.getPointAtLength(length*i/samples);
                        const q = projectElectrode(electrodeId, p.x, p.y);
                        if (!q) continue;
                        if (!started) {ctx.moveTo(q.x,q.y);started=true;}
                        else ctx.lineTo(q.x,q.y);
                    }
                    if (started) {
                        ctx.closePath();
                        ctx.strokeStyle = localSession && selectedLocalId===electrodeId ? "#00ffff" : "#ff00ff";
                        ctx.lineWidth = localSession && selectedLocalId===electrodeId ? 5 : 3;
                        ctx.stroke();drawn++;
                    }
                }
            }
            drawAdjustHandles(ctx,canvas);
            refreshAdjustButtons();
            // Debug logging on every mousemove overwhelms the Console.
            if (!adjustSession) console.log(`Calibration preview: ${drawn} SVG electrodes drawn.`);
        }

        // After browser refresh, the older camera controls default to 1.0x,
        // 50%/50% pan. Recover the saved camera VIEW via those actual controls
        // before validating the saved reference. Do not fake the signature.
        // This runs only during initialization of a newly started camera.
        function restoreSavedCameraView(signature) {
            if (!signature || !video.videoWidth ||
                video.videoWidth !== signature.width ||
                video.videoHeight !== signature.height ||
                videoIdentity() !== signature.camera) return false;

            const zoomInput = document.getElementById("camera-zoom");
            if (!zoomInput) return false;
            if (Math.abs(Number(zoomInput.value) - signature.zoom) > 0.005) {
                zoomInput.value = String(signature.zoom);
                zoomInput.dispatchEvent(new Event("input", {bubbles:true}));
            }

            // Click the existing UI arrows so their internal pan state
            // remains synchronized. Each click changes the origin by 3%.
            const targetX = Math.round(signature.originX * 100);
            const targetY = Math.round(signature.originY * 100);
            const current = transformSignature();
            const currentX = Math.round(current.originX * 100);
            const currentY = Math.round(current.originY * 100);
            const dx = targetX - currentX;
            const dy = targetY - currentY;
            if (Math.abs(dx % 3) > 0 || Math.abs(dy % 3) > 0) return false;
            const findPan = direction => Array.from(
                document.querySelectorAll(".camera-pan-controls button")
            ).find(b => b.title === `Pan camera view ${direction}`);
            const xButton = findPan(dx >= 0 ? "right" : "left");
            const yButton = findPan(dy >= 0 ? "down" : "up");
            if ((dx && !xButton) || (dy && !yButton)) return false;
            for (let i = 0; i < Math.abs(dx) / 3; i++) xButton.click();
            for (let i = 0; i < Math.abs(dy) / 3; i++) yButton.click();
            return sameView(signature, transformSignature());
        }

        // Experimental eight-point click workflow. It is separate from the legacy
        // four-point camera handler in ui-controls.js and the chip.js SVG handler.
        // Camera clicks are captured on a high-z overlay; SVG clicks on its parent
        // capture phase, so DropBot electrode selection is never accidentally fired.
        const eightNames = ["Top-left reservoir", "Top-right reservoir",
            "Bottom-right reservoir", "Bottom-left reservoir",
            "Middle-left reservoir", "Middle-right reservoir",
            "Upper gray rectangle (large bottom SVG rectangle)",
            "Lower central transport electrode (near bottom working row)"];
        const chipSvg=document.querySelector(".svg-wrapper svg");
        let eightCanvas=null;
        let eightSvgMarkers=null;

        function clearEightMarkers() {
            if(eightCanvas) {eightCanvas.remove();eightCanvas=null;}
            if(eightSvgMarkers) {eightSvgMarkers.remove();eightSvgMarkers=null;}
        }
        function paintEightCamera() {
            if(!eightCanvas || !eightSession) return;
            const ctx=eightCanvas.getContext("2d");
            ctx.clearRect(0,0,eightCanvas.width,eightCanvas.height);
            const scale=eightCanvas.width/Math.max(1,eightCanvas.getBoundingClientRect().width);
            ctx.font=`bold ${12*scale}px sans-serif`;
            ctx.textBaseline="middle";ctx.textAlign="center";
            for(let i=0;i<eightSession.cam.length;i++) {
                const p=eightSession.cam[i];
                ctx.beginPath();ctx.arc(p.x,p.y,9*scale,0,Math.PI*2);
                ctx.fillStyle="#22c55e";ctx.fill();ctx.strokeStyle="white";
                ctx.lineWidth=1.5*scale;ctx.stroke();ctx.fillStyle="#111827";
                ctx.fillText(String(i+1),p.x,p.y);
            }
        }
        function addSvgEightMarker(p,index) {
            if(!eightSvgMarkers || !chipSvg) return;
            const ns="http://www.w3.org/2000/svg";
            const dot=document.createElementNS(ns,"circle");
            dot.setAttribute("cx",p.x);dot.setAttribute("cy",p.y);
            dot.setAttribute("r","1.35");dot.setAttribute("fill","#22c55e");
            dot.setAttribute("stroke","white");dot.setAttribute("stroke-width",".35");
            const label=document.createElementNS(ns,"text");
            label.setAttribute("x",p.x);label.setAttribute("y",p.y+0.65);
            label.setAttribute("font-size","1.9");label.setAttribute("text-anchor","middle");
            label.setAttribute("fill","#111827");label.textContent=String(index);
            eightSvgMarkers.append(dot,label);
        }
        function cancelEight(reason) {
            if(!eightSession) return;
            eightSession=null;clearEightMarkers();
            eightButton.textContent="Calibrate 8 Points";
            report(reason || "Eight-point calibration cancelled; existing mapping preserved.");
        }
        function checkEightView() {
            return !!eightSession && sameView(eightSession.signature,transformSignature());
        }
        function completeEight() {
            const cam=eightSession.cam, svg=eightSession.svg;
            const fitted=solveHomographyLS(svg,cam);
            if(!fitted) {cancelEight("Eight-point fit failed. Check that all points are distinct and correctly matched.");return;}
            const residuals=svg.map((p,i)=>distance(project(fitted,p.x,p.y)||{x:Infinity,y:Infinity},cam[i]));
            const rms=Math.sqrt(residuals.reduce((sum,d)=>sum+d*d,0)/8);
            const max=Math.max(...residuals);
            if(!Number.isFinite(rms)||rms>15||max>30) {
                cancelEight(`Eight-point fit rejected: RMS ${rms.toFixed(1)} px; maximum ${max.toFixed(1)} px. Check point 7 on the gray rectangle and point 8 on the lower center transport electrode.`);
                return;
            }
            cancelEight();
            localStorage.removeItem(TRANSFER_KEY); // new 8-point mapping supersedes transfer
            // A new global mapping supersedes camera-space local corrections.
            localEdits={};selectedLocalId=null;
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            reference = null;
            autoButton.disabled = true;
            precisionButton.disabled = true;
            displayProjection(fitted,svg.map(p=>project(fitted,p.x,p.y)),svg);
            // Only the operator's eight landmark observations yield residuals;
            // these are NOT independent validation of electrode-edge accuracy.
            report(`8-point fit: landmark RMS ${rms.toFixed(1)} px, max ${max.toFixed(1)} px. Inspect magenta outlines, Save Reference on an EMPTY chip, then Precision Align + Check.`,rms<=5?"good":"warning");
        }
        function beginEight() {
            if(!chipSvg) {report("Chip SVG not found; cannot start 8-point calibration.","warning");return;}
            if(!video.videoWidth || video.readyState<2) {report("Start the live camera first.","warning");return;}
            if(adjustSession || localSession) {report("Save or cancel the current overlay edits first.","warning");return;}
            if(window.ewodCalibrationMode) {report("Finish or cancel the previous calibration first.","warning");return;}
            eightSession={cam:[],svg:[],phase:"camera",signature:transformSignature()};
            eightButton.textContent="Cancel 8-Point Calibration";
            const parent=overlay.parentElement;
            eightCanvas=document.createElement("canvas");
            eightCanvas.id="ewod-eight-point-picker";
            eightCanvas.width=overlay.width||video.videoWidth;
            eightCanvas.height=overlay.height||video.videoHeight;
            eightCanvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:30;cursor:crosshair;touch-action:none;";
            parent.appendChild(eightCanvas);
            report(`Camera point 1/8: ${eightNames[0]}. Click the matching landmark exactly; stay at the same camera zoom/pan.`);
        }
        eightButton.addEventListener("click",()=>eightSession?cancelEight():beginEight());
        // Capture click via parent to avoid altering chip.js (legacy 4-point mode).
        chipSvg?.parentElement?.addEventListener("click",event=>{
            if(!eightSession || eightSession.phase!=="svg") return;
            event.preventDefault();event.stopImmediatePropagation();
            if(!checkEightView()) {cancelEight("Camera view changed; restart eight-point calibration.");return;}
            const p=chipSvg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
            const matrix=chipSvg.getScreenCTM();if(!matrix)return;
            const q=p.matrixTransform(matrix.inverse());
            eightSession.svg.push({x:q.x,y:q.y});
            addSvgEightMarker(q,eightSession.svg.length);
            if(eightSession.svg.length===8) {completeEight();return;}
            report(`SVG point ${eightSession.svg.length+1}/8: ${eightNames[eightSession.svg.length]}. Match the corresponding camera landmark.`);
        },true);
        // Install one delegated camera click listener; eightCanvas recreated per run.
        overlay.parentElement.addEventListener("click",event=>{
            if(!eightSession || eightSession.phase!=="camera" || event.target!==eightCanvas) return;
            event.preventDefault();event.stopImmediatePropagation();
            if(!checkEightView()) {cancelEight("Camera view changed; restart eight-point calibration.");return;}
            const p=screenToOverlay(event,eightCanvas);
            eightSession.cam.push(p);paintEightCamera();
            if(eightSession.cam.length===8) {
                eightSession.phase="svg";
                eightCanvas.style.pointerEvents="none";
                eightSvgMarkers=document.createElementNS("http://www.w3.org/2000/svg","g");
                eightSvgMarkers.setAttribute("pointer-events","none");
                chipSvg.appendChild(eightSvgMarkers);
                report(`Camera points 1–8 captured. Click SVG point 1/8: ${eightNames[0]}.`);
            } else report(`Camera point ${eightSession.cam.length+1}/8: ${eightNames[eightSession.cam.length]}.`);
        },true);
        document.addEventListener("keydown",event=>{
            if(eightSession && event.key==="Escape") cancelEight();
        });

        function restore() {
            try {
                // Optional one-time transfer of the unsaved on-screen mapping
                // from V1.6. Restore only if camera identity, dimensions, zoom,
                // and pan still match. Never mark it as precision-verified.
                const transfer = JSON.parse(localStorage.getItem(TRANSFER_KEY) || "null");
                if (transfer && Array.isArray(transfer.H) && transfer.H.length===3 &&
                    [4,8].includes(transfer.cameraPoints?.length) &&
                    transfer.svgPoints?.length===transfer.cameraPoints.length &&
                    (sameView(transfer.signature, transformSignature()) ||
                     restoreSavedCameraView(transfer.signature))) {
                    reference=null;
                    displayProjection(transfer.H,transfer.cameraPoints,transfer.svgPoints);
                    autoButton.disabled=true;
                    precisionButton.disabled=true;
                    report("Previous unsaved magenta alignment recovered. On an EMPTY chip, click Save Reference before Precision Align + Check.","good");
                    return;
                }
                const item = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
                if (!item || item.version !== 1 || !item.H || !item.reference) return;
                if (item.reference.geometryFingerprint &&
                    electrodeGeometryFingerprint() !== item.reference.geometryFingerprint) {
                    report("SVG geometry changed. Perform a new four- or eight-point calibration and Save Reference.", "warning");
                    return;
                }
                if (!sameView(item.reference.signature, transformSignature())) {
                    if (!restoreSavedCameraView(item.reference.signature)) {
                        report("Saved calibration available, but camera or view differs. Use the original Logitech camera/resolution or calibrate manually.", "warning");
                        return;
                    }
                }
                reference = item.reference;
                try {localEdits=readLocalEdits();}
                catch(error) {localEdits={};report(error.message,"warning");}
                displayProjection(item.H, item.cameraPoints, item.svgPoints);
                autoButton.disabled = !canAutoMatch() || !!Object.keys(localEdits).length;
                precisionButton.disabled = false;
                report(referenceSavedMessage("Saved calibration loaded."), "good");
            } catch (error) {report(`Could not load calibration: ${error.message}`, "warning");}
        }

        // chip.js emits this event after the fourth *matching* SVG click.
        window.addEventListener("ewod:svg-calibration-complete", () => {
            const cam = window.ewodCameraCalibrationPoints;
            const svg = window.ewodSvgCalibrationPoints;
            if (cam?.length !== 4 || svg?.length !== 4) {
                report("Four matching camera/SVG points are required.", "warning");
                return;
            }
            const matrix = solveHomography(svg, cam);
            if (!matrix) {report("Calibration failed: landmarks are degenerate.", "warning");return;}
            // Sanity check: don't trust mappings that are nonfinite or off-frame.
            if (svg.some(p => !project(matrix,p.x,p.y))) {
                report("Calibration failed: invalid projection.", "warning"); return;
            }
            localEdits={};localStorage.removeItem(LOCAL_STORAGE_KEY);
            displayProjection(matrix, cam.map(p=>({...p})), svg.map(p=>({...p})));
            report("Four-point mapping complete. Check magenta outlines, then click Save Reference on an EMPTY chip.", "good");
        });

        saveButton.addEventListener("click", () => {
            try {
                captureSavedReference();
                report(referenceSavedMessage("Empty-chip reference saved locally."), "good");
            } catch (error) {report(`Save failed: ${error.message}`, "warning");}
        });

        restoreButton.addEventListener("click", () => {
            if (!reference || !lastSvgPoints || !sameView(reference.signature,transformSignature())) {
                report("Saved reference not available for this camera view.","warning");
                return;
            }
            const original=reference.baseH || solveHomographyLS(lastSvgPoints,reference.cameraPoints);
            if (!original) {
                report("Could not restore original calibration.","warning");
                return;
            }
            displayProjection(original,reference.cameraPoints.map(p=>({...p})),lastSvgPoints);
            saveState();
            report("Original reference alignment restored. Valid only if chip is back at its saved physical position.","good");
        });

        autoButton.addEventListener("click", () => {
            autoButton.disabled = true;
            report("Searching for the four reservoir landmarks…");
            // Yield a frame so the status updates before CPU-intensive matching.
            requestAnimationFrame(() => setTimeout(() => {
                try {
                    if (!reference || !lastSvgPoints) throw new Error("Save an empty-chip reference first.");
                    const frame = snapshot();
                    window.ewodCalibrationReady = false;
                    if (!sameView(reference.signature, frame.signature)) {
                        throw new Error("Camera, resolution, zoom or pan changed. Restore the reference view or recalibrate manually.");
                    }
                    const matches = reference.templates.map(t => matchTemplate(frame,t));
                    const scores = matches.map(m => m.score);
                    if (scores.some(score => !Number.isFinite(score) || score < 0.76)) {
                        throw new Error(`Image match uncertain (scores ${scores.map(s=>s.toFixed(2)).join(", ")}). Use 8-point calibration.`);
                    }
                    const initial = reference.templates.map(t => ({x:t.x,y:t.y}));
                    const current = matches.map(m => ({x:m.x,y:m.y}));
                    if (!validateGeometry(initial,current)) {
                        throw new Error("Matched landmarks have inconsistent geometry. Try 8-point calibration.");
                    }
                    const rigid = fitRigid(initial, current);
                    if (!rigid || rigid.rms > 4 || rigid.maxResidual > 7) {
                        throw new Error("Reservoir matches disagree on a rigid shift/rotation. Check lighting or use manual calibration.");
                    }
                    const updated = applyRigidToReference(rigid, frame);
                    if (!updated || lastSvgPoints.some(p=>!project(updated,p.x,p.y))) {
                        throw new Error("Could not compute reliable rigid mapping.");
                    }
                    // Ignore subpixel-scale jitter if the predicted overlay is
                    // nearly identical to the currently displayed overlay.
                    const candidatePoints = lastSvgPoints.map(p=>project(updated,p.x,p.y));
                    if (H && lastCameraPoints?.length===lastSvgPoints.length &&
                        Math.max(...candidatePoints.map((p,i)=>distance(p,lastCameraPoints[i]))) < 5) {
                        report(`Alignment stable; no update needed (${scores.map(s=>s.toFixed(2)).join(" / ")} similarity).`,"good");
                        return;
                    }
                    displayProjection(updated,candidatePoints,lastSvgPoints);
                    saveState();
                    report(`Rigid auto-aligned (${scores.map(s=>s.toFixed(2)).join(" / ")} similarity, ${rigid.rms.toFixed(1)} px match error at ${frame.width}px). Inspect electrodes and recapture EMPTY background.`,"good");
                } catch (error) {report(`Auto calibration stopped: ${error.message}`, "warning");}
                finally {autoButton.disabled = !canAutoMatch();}
            }, 0));
        });

        precisionButton.addEventListener("click", () => {
            precisionButton.disabled = true;
            report("Finding chip position and checking electrode edges...");
            requestAnimationFrame(() => setTimeout(() => {
                try {
                    // Full auto repositioning only when four valid reservoir
                    // templates exist. Otherwise check actual electrode edges
                    // relative to the current saved, stationary chip position.
                    if (canAutoMatch() && !Object.keys(localEdits).length) coarseForPrecision();
                    precisionRegistration();
                }
                catch(error) {
                    window.ewodCalibrationReady = false;
                    window.ewodAlignmentQuality = {passed:false,reason:error.message};
                    report(`Precision check stopped: ${error.message}`,"warning");
                } finally {precisionButton.disabled = !reference;}
            },0));
        });

        resetButton.addEventListener("click", () => {
            adjustSession = null;
            localSession = null;
            localEdits={};selectedLocalId=null;
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TRANSFER_KEY);
            reference = null;
            H = null;
            lastCameraPoints = null;
            lastSvgPoints = null;
            window.ewodHomography = null;
            window.ewodProject = null;
            window.ewodCalibrationViewSignature = null;
            document.getElementById("ewod-auto-calibration-preview")?.remove();
            autoButton.disabled = true;
            precisionButton.disabled = true;
            window.ewodCalibrationReady = false;
            window.ewodAlignmentQuality = {passed:false,reason:"Calibration cleared"};
            refreshAdjustButtons();
                report("Saved calibration cleared. Start with Calibrate 8 Points.");
        });

        // Any camera view change invalidates the geometric correspondence.
        const zoomControl = document.getElementById("camera-zoom");
        zoomControl?.addEventListener("input", () => {
            if (localSession) clearLocalSession(true);
            if (adjustSession) {adjustSession = null;refreshAdjustButtons();}
            if (H) {
                document.getElementById("ewod-auto-calibration-preview")?.remove();
                window.ewodHomography = null;
                window.ewodProject = null;
                window.ewodCalibrationReady = false;
                report("Zoom changed: saved alignment no longer valid. Restore reference zoom/pan or recalibrate.", "warning");
            }
        });
        document.querySelectorAll(".camera-pan-controls button").forEach(button => {
            button.addEventListener("click", () => {
                if (adjustSession) {adjustSession = null;refreshAdjustButtons();}
                if (H) {
                    document.getElementById("ewod-auto-calibration-preview")?.remove();
                    window.ewodHomography = null;
                    window.ewodProject = null;
                    window.ewodCalibrationReady = false;
                    report("Pan changed: restore previous view or recalibrate.", "warning");
                }
            });
        });

        function onVideoChanged() {
            if(localSession && !sameView(localSignature(),transformSignature()))clearLocalSession(true);
            if (adjustSession && !sameView(adjustSession.signature,transformSignature())) {
                adjustSession = null;
                refreshAdjustButtons();
            }
            // The reference variable starts null after a refresh even when
            // localStorage still contains a valid saved calibration.
            if (!reference && video.videoWidth) restore();
            if (reference && !sameView(reference.signature, transformSignature())) {
                document.getElementById("ewod-auto-calibration-preview")?.remove();
                window.ewodHomography = null;
                window.ewodProject = null;
                window.ewodCalibrationReady = false;
                report("Camera/view changed. Restore original webcam, resolution, zoom and pan, or recalibrate.", "warning");
            }
            if (reference && !H) restore();
        }
        if (video.readyState >= 2 && video.videoWidth) restore();
        video.addEventListener("loadedmetadata", onVideoChanged);
        // Browser camera tracks may receive their name/settings *after*
        // loadedmetadata. Retry once playback actually begins.
        video.addEventListener("loadeddata", onVideoChanged);
        video.addEventListener("playing", () => {
            requestAnimationFrame(onVideoChanged);
            setTimeout(onVideoChanged, 400);
        });
        refreshAdjustButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else init();
})();
