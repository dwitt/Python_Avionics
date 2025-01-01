import { Application, Graphics } from './pixi.min.mjs';

(async () =>
{
'use strict';

const app = new Application();

await app.init({ width: 480,
                 height: 400}
);

document.body.appendChild(app.canvas);

const myGraphics = new Graphics();

myGraphics.rect(200, 50, 100, 100);
myGraphics.fill(0x650a5a);
myGraphics.stroke({ width: 2, color: 0xfeeb77 });

app.stage.addChild(myGraphics);

})();