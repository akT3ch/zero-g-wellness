// Presentation only. The original monitor remains the authority for medical evaluation.
(function () {
  const fields = {
    brain: ['sleep', 'mood', 'stress', 'isol'], eye: [],
    heart: ['hr', 'sys', 'dia', 'spo2'], immun: ['temp', 'fatigue'],
    gut: ['gluc', 'meal'], bone: ['back', 'ex'], muscle: ['ex', 'back'], rad: ['dose', 'co2'],
  };
  function status(key, domain, entry, measured) {
    if (domain?.l > 0) return domain.l; // Never conceal an existing warning or action.
    const required = fields[key] || [];
    if (!entry || !domain || !required.length || !required.every(k => measured(entry, k) && Number.isFinite(entry[k]))) return 'n';
    return 0;
  }
  const path = (d, cls = '') => `<path class="${cls}" d="${d}"/>`;
  const mirrored = (content) => content + `<g transform="translate(400 0) scale(-1 1)">${content}</g>`;
  const silhouette = 'M200 24 C167 24 155 48 157 76 C156 96 164 116 179 125 L179 146 C162 156 137 159 119 169 C97 181 92 211 87 241 L70 328 C65 343 49 377 43 405 L29 448 L17 462 Q9 471 16 475 L33 464 L23 490 Q22 501 29 497 L43 471 L36 505 Q38 513 43 505 L53 475 L50 503 Q54 511 59 501 L65 467 Q76 455 77 438 L87 398 L113 323 L128 254 Q138 279 131 310 Q118 355 133 393 L132 472 Q123 529 131 569 L139 656 Q134 690 141 731 L151 794 L144 817 Q132 834 143 840 L179 840 Q190 837 186 822 L178 790 L180 717 L184 658 L193 573 L200 470 L207 573 L216 658 L220 717 L222 790 L214 822 Q210 837 221 840 L257 840 Q268 834 256 817 L249 794 L259 731 Q266 690 261 656 L269 569 Q277 529 268 472 L267 393 Q282 355 269 310 Q262 279 272 254 L287 323 L313 398 L323 438 Q324 455 335 467 L341 501 Q346 511 350 503 L347 475 L357 505 Q362 513 364 505 L357 471 L371 497 Q378 501 377 490 L367 464 L384 475 Q391 471 383 462 L371 448 L357 405 Q351 377 330 328 L313 241 C308 211 303 181 281 169 C263 159 238 156 221 146 L221 125 C236 116 244 96 243 76 C245 48 233 24 200 24 Z';
  const landmarks = {
    brain: [174, 61, 88, 58, 'Brain'], eye: [220, 112, 302, 111, 'Vision'],
    heart: [208, 249, 329, 235, 'Circulation'], immun: [111, 208, 71, 188, 'Skin / immune'],
    gut: [178, 361, 70, 331, 'Digestion'], bone: [245, 572, 324, 550, 'Skeleton'],
    muscle: [147, 476, 67, 481, 'Muscles'], rad: [247, 745, 329, 727, 'Whole body'],
  };
  const group = (key, contents) => `<g class="rg" data-r="${key}">${contents}</g>`;
  function landmark(key) {
    const [x, y, labelX, labelY, label] = landmarks[key];
    return `<g class="anatomy-landmark" data-landmark="${key}" aria-hidden="true">
      <path d="M${x} ${y} L${labelX} ${labelY}"/>
      <circle cx="${x}" cy="${y}" r="3.8"/>
      <rect x="${labelX - 37}" y="${labelY - 13}" width="74" height="26" rx="7"/>
      <text x="${labelX}" y="${labelY}" dy=".34em">${label}</text>
    </g>`;
  }
  function mount(svg) {
    svg.setAttribute('viewBox', '0 0 400 860');
    svg.removeAttribute('style');
    svg.setAttribute('aria-label', 'Interactive anatomical body model');
    const ribs = Array.from({length: 8}, (_, i) => mirrored(path(`M195 ${199+i*13} Q${149-i*2} ${183+i*14} ${137-i} ${204+i*14} Q${123-i} ${222+i*12} 188 ${223+i*12}`, 'anatomy-rib'))).join('');
    const spine = Array.from({length: 27}, (_, i) => `<path class="anatomy-vertebra" d="M192 ${130+i*9} Q200 ${126+i*9} 208 ${130+i*9} L207 ${136+i*9} Q200 ${140+i*9} 193 ${136+i*9} Z"/>`).join('');
    const face = mirrored(path('M161 91 Q153 85 151 94 Q151 110 160 111 M165 107 Q169 124 181 134 Q190 140 200 140 M168 105 Q180 99 192 107 M173 119 Q181 122 187 119 M187 132 L198 131', 'anatomy-face')) + path('M198 114 L194 126 Q200 130 206 126 L202 114 M187 135 Q200 139 213 135', 'anatomy-face');
    const hand = mirrored(path('M53 428 Q49 445 46 454 M46 454 L29 465 M46 454 L32 489 M52 455 L43 495 M57 455 L54 490 M61 452 L63 477', 'anatomy-fine-bone'));
    const limbs = mirrored(path('M127 184 Q109 198 110 228 L83 330 M81 348 L54 430 M132 404 Q159 390 181 412 L164 565 M148 583 L161 771', 'anatomy-long-bone') + path('M144 421 L152 561 M157 599 L171 770', 'anatomy-fine-bone') + '<circle class="anatomy-joint" cx="158" cy="575" r="13"/>' + path('M143 784 L155 822 M150 811 L168 825 M155 799 L176 817', 'anatomy-fine-bone'));
    const muscles = mirrored(path('M119 181 C97 197 99 244 111 265 C126 239 133 210 119 181 Z M101 272 C91 287 84 321 82 337 C95 327 107 297 101 272 Z M73 351 C54 373 48 401 46 428 C65 417 79 380 73 351 Z M141 417 C128 450 127 508 143 551 C157 526 170 454 165 420 Z M167 425 C177 470 174 526 157 556 C150 513 158 464 167 425 Z M145 602 C133 637 143 697 152 731 C164 703 166 639 158 606 Z', 'anatomy-muscle'));
    const fibers = mirrored(Array.from({length: 5}, (_, i) => path(`M${137+i*5} 434 Q${130+i*6} 485 ${145+i*3} 538 M${147+i*2} 617 Q${140+i*4} 665 ${153+i*2} 717`, 'anatomy-fiber')).join(''));
    const brainFolds = mirrored(path('M195 40 C173 31 163 49 171 59 C158 61 161 79 174 81 C165 92 178 107 193 100 M187 40 Q179 49 189 57 Q172 60 182 71 Q194 72 187 88 M171 49 Q176 54 174 63 M170 81 Q181 76 181 92', 'anatomy-detail'));
    const vessels = mirrored(path('M197 260 L193 175 Q184 152 176 122 M192 187 Q149 172 126 201 L98 305 L77 370 M196 278 L191 387 Q177 409 158 471 L151 552 L162 697 M171 446 L145 475', 'anatomy-vessel'));
    const branches = mirrored(path('M200 190 L190 219 M190 219 L164 242 M174 233 L151 222 M171 236 L151 260 M165 245 L159 281 M189 221 L177 276 M177 254 L166 264', 'anatomy-bronchi'));
    const intestine = Array.from({length: 5}, (_, i) => path(`M164 ${342+i*10} C177 ${331+i*10} 223 ${355+i*10} 233 ${342+i*10} C245 ${333+i*10} 227 ${326+i*10} 215 ${337+i*10} C199 ${350+i*10} 176 ${338+i*10} 168 ${349+i*10}`, 'anatomy-intestine')).join('');
    svg.innerHTML = `<defs>
      <linearGradient id="anatomy-skin" x1="0" x2="1"><stop stop-color="var(--anatomy-shell)"/><stop offset=".5" stop-color="var(--card)" stop-opacity=".1"/><stop offset="1" stop-color="var(--anatomy-shell)"/></linearGradient>
      <linearGradient id="anatomy-organ" x2=".9" y2="1"><stop stop-color="var(--anatomy-organ-light)"/><stop offset="1" stop-color="var(--anatomy-organ)"/></linearGradient>
      <linearGradient id="anatomy-muscle" x2="1" y2=".3"><stop stop-color="var(--anatomy-muscle-light)"/><stop offset="1" stop-color="var(--anatomy-muscle)"/></linearGradient>
    </defs>
    ${group('rad', path(silhouette, 'anatomy-silhouette') + face)}
    ${group('immun', mirrored(path('M119 169 Q98 178 94 213 L84 273 L99 278 L115 231 Q122 204 136 184 Z', 'anatomy-skin-region')) + '<g class="anatomy-lymph">' + mirrored(path('M173 138 L151 188 L146 288 L166 363 L173 406 M151 188 L115 224', 'anatomy-lymph-line') + [ [151,188],[146,288],[166,363],[173,406],[115,224] ].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('')) + '</g>')}
    ${group('muscle', muscles + fibers)}
    ${group('bone', spine + ribs + limbs + hand + mirrored(path('M193 172 Q170 160 126 178 M193 386 Q160 372 140 395 L155 417 L185 431 L194 407', 'anatomy-pelvis')) + path('M178 104 Q200 115 222 104 L216 122 Q200 132 184 122 Z', 'anatomy-pelvis'))}
    ${group('heart', path('M187 190 C165 180 144 198 139 231 C132 260 137 288 159 298 C180 302 190 287 189 264 Z M213 190 C235 180 256 198 261 231 C268 260 263 288 241 298 C220 302 210 287 211 264 Z', 'anatomy-lung') + branches + mirrored(path('M144 247 Q166 252 187 276 M153 213 Q160 226 159 243 M163 237 L153 233 M171 252 L169 277 M176 258 L181 271', 'anatomy-lobe')) + vessels + path('M200 187 L200 211 M188 202 Q205 179 214 202 L211 224', 'anatomy-artery') + path('M194 222 C185 213 175 221 176 235 C177 248 187 257 194 262 C202 269 210 280 219 280 C231 272 232 258 227 245 C224 235 217 224 208 221 C202 219 198 220 194 222 Z', 'anatomy-heart') + path('M198 225 C192 242 200 258 217 273 M197 239 Q208 241 221 235 M202 246 Q211 247 225 253 M206 255 L215 258 M189 230 Q182 236 188 248', 'anatomy-detail'))}
    ${group('gut', path('M146 307 C158 291 187 293 209 301 L204 320 Q168 339 146 330 Z', 'anatomy-liver') + path('M218 300 C236 301 249 322 236 332 C222 345 204 335 201 329 L208 314 Q210 335 223 325 L218 300 Z', 'anatomy-stomach') + path('M155 344 Q143 342 148 371 L153 393 Q170 405 188 400 L228 402 Q251 403 247 379 L246 344 Q245 336 234 340 L167 339 Q156 338 155 344 Z', 'anatomy-colon') + intestine)}
    ${group('brain', path('M198 36 C179 24 161 42 161 58 C153 74 168 106 196 103 Z M202 36 C221 24 239 42 239 58 C247 74 232 106 204 103 Z', 'anatomy-brain') + brainFolds + path('M200 107 L200 387 M200 163 L130 194 M200 283 L117 316 M200 381 L159 478 M200 381 L241 478', 'anatomy-nerve'))}
    ${group('eye', mirrored(path('M171 111 Q180 103 191 111 Q181 122 171 111 Z', 'anatomy-eye') + '<circle class="anatomy-iris" cx="181" cy="112" r="4"/>') + path('M190 110 L200 100 L210 110', 'anatomy-nerve'))}
    ${Object.keys(landmarks).map(landmark).join('')}`;
  }
  window.BodyAnatomy = { fields, status, mount };
})();