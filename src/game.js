import { Shape } from "./canvas.js";
import { Stage, Tile } from "./stage.js";
import { ObjectManager } from "./objects.js";
import { MOVE_TIME } from "./movable.js";
import { Transition } from "./transition.js";
import { Action, State } from "./input.js";
import { negMod, clamp } from "./util.js";

//
// Game scene
// (c) 2019 Jani Nykänen
//


// Local constants
const BG_COLOR = [0.33, 0.67, 1.00];


//
// Game scene class
//
export class Game {


    //
    // Constructor
    // 
    constructor(gl) {

        this.id = 2;

        // "Restart"
        this.restart();

        // Cog angle
        this.cogAngle = 0.0;
        // Floating text value
        this.textFloatValue = 0.0;

        // Local transition manager
        this.localTr = new Transition();
        this.localTr.activate(false, 1.0, ...BG_COLOR);

        // Is stuck
        this.stuck = 0;
        // Stuck wave
        this.stuckWave = 0.0;
    }


    //
    // Restart stage
    //
    restart(id) {

        if (id != null && id > 0)
            this.id = id;

        // (Re)create an object manager
        this.objMan = new ObjectManager();
        // (Re)create a stage
        this.stage = new Stage(this.id, this.objMan);
    }


    //
    // Set restart transitoin
    //
    restartTransition(stuck) {

        const STUCK_DELAY = 30;
        
        this.localTr.activate(
            true, stuck ? (3.0-stuck) : 2, 
            ...BG_COLOR, () => 
                {this.restart(stuck == 2 ? (++this.id) : 0);
                },
            STUCK_DELAY * stuck
        );

        this.stuck = stuck;
    }


    //
    // Update the game scene
    //
    update(ev) {

        const COG_SPEED = Math.PI/2.0 / MOVE_TIME;
        const FLOAT_SPEED = 0.05;
        const STUCK_WAVE_SPEED = 0.025;

        // Update floating text
        this.textFloatValue += FLOAT_SPEED * ev.step;
        
        if (this.objMan.isActive() ||
            this.localTr.active) {

            // Update cog angle
            this.cogAngle = negMod(
                this.cogAngle + COG_SPEED * 
                (this.localTr.active ? -1 : 1) * ev.step ,
                (Math.PI / 2));
        }
        else {

            this.cogAngle = 0;
        }

        // Update local transition, if active
        if (this.localTr.active) {

            if (this.stuck > 0) {

                this.stuckWave = 
                    (this.stuckWave + STUCK_WAVE_SPEED*ev.step) % 
                    (Math.PI*2);
            }

            this.localTr.update(ev);
            return;
        }

        // Update stage
        this.stage.update(this.objMan.eggsCollected(), ev);

        // Update objects
        this.objMan.update(this.stage, this, ev);

        // Go to the next stage, if stage finished
        if (this.objMan.stageFinished()) {

            this.restartTransition(2);
            return;
        }

        // Check restart key
        if (ev.input.getKey(Action.Reset) == State.Pressed) {

            this.restartTransition();
        }
        
    }


    //
    // Draw a single cog
    //
    drawCog(c, dx, dy, r, outline, angle, sx, sy, salpha) {

        const COLOR_OUTLINE = [0.5, 0.5, 0.5];
        const COLOR_BASE = [0.75, 0.75, 0.75];

        // Draw shadow
        if (sx != null) {

            c.push();
            c.translate(dx + sx, dy + sy);
            c.rotate(angle);
            c.useTransform();

            c.setColor(0, 0, 0, salpha);
            c.fillShape(Shape.Cog, 0, 0, r, r);

            c.pop();
        }

        // Draw the actual cog
        c.push();
        c.translate(dx, dy);
        c.rotate(angle);
        c.useTransform();

        // Draw base color
        c.setColor(...COLOR_OUTLINE);
        c.fillShape(Shape.Cog, 0, 0, r, r);

        // Draw base color
        c.setColor(...COLOR_BASE);
        c.fillShape(Shape.Cog, 0, 0, r - outline, r - outline);

        c.pop();
    }


    //
    // Draw cogs
    //
    drawCogs(c) {

        // Top-left corner
        this.drawCog(c, 0, 0, 128, 8, 
                this.cogAngle,
                16, 8, 0.25);

        // Top-right corner
        this.drawCog(c, c.viewport.x, 0, 96, 8, 
            -this.cogAngle,
            16, 8, 0.25);

        // Bottom-left corner
        this.drawCog(c, 0, c.viewport.y, 
            96, 8, 
            -this.cogAngle,
            16, 8, 0.25);

        // Bottom-right corner
        this.drawCog(c, c.viewport.x, c.viewport.y, 
            128, 8, 
            this.cogAngle,
            16, 8, 0.25);
    }


    //
    // Draw stage info
    //
    drawStageInfo(c) {

        const TEXT = ["STAGE " + String(this.id), "Password: NONE"];

        const POS_Y = 4;

        const FONT_SIZE = [64, 48];
        const AMPLITUDE = [6.0, 4.0];
        const PERIOD = [Math.PI/3, Math.PI/6];

        const SHADOW_ALPHA = 0.25;
        const SHADOW_X = [6, 4];
        const SHADOW_Y = [6, 4];

        c.toggleTexturing(true);

        // Draw stage text
        let y, top;
        for (let j = 0; j < 2; ++ j) {

            // F**king beautiful, isn't it
            top = (this.stuck == 2 && this.localTr.active) ? 
                (Math.max(this.localTr.getScaledTime(), 
                    this.localTr.getScaledDelayTime()) * 
                (AMPLITUDE[j] + FONT_SIZE[j])) : 0;

            for (let i = 1; i >= 0; -- i) {

                if (j == 0)
                    y = POS_Y + Tile.Height/2;
                else
                    y = c.viewport.y - POS_Y - Tile.Height/2;
                y -= FONT_SIZE[j]/2 - i *SHADOW_Y[j];
                y -= (1 - 2*j) * top;

                if (i == 1)
                    c.setColor(0, 0, 0, SHADOW_ALPHA);
                else
                    c.setColor(1, 1, 0.5);

                c.drawScaledText(TEXT[j], 
                    c.viewport.x/2 + i*SHADOW_X[j], y,
                    -16, 0, 
                    FONT_SIZE[j], FONT_SIZE[j], true, 
                    PERIOD[j], AMPLITUDE[j],
                    this.textFloatValue);

            }
        }
    }


    //
    // Draw stuck text
    //
    drawStuck(c) {

        const FONT_SCALE = 96;
        const OFFSET = 72;
        const STR = ["STUCK", "STAGE CLEAR"] [this.stuck -1];
        const MOVE = 64;
        const WAVE_AMPLITUDE = -16;
        const COLOR = [ [1, 0.4, 0.0], [1, 1, 0.5]] [this.stuck -1];
        const SHADOW_OFF = 8;
        const SHADOW_ALPHA = 0.25;

        let mx = c.viewport.x/2;
        let my = c.viewport.y/2;

        let left = mx - (STR.length-1) * OFFSET / 2; 

        c.toggleTexturing(true);

        let t = this.localTr.getScaledTime();
        if (this.localTr.fadeIn) {

            t = this.localTr.getScaledDelayTime();;
        }
        
        let p = 0;
        let d = 1.0/STR.length;
        let y;
        
        for (let i = 0; i < STR.length; ++ i) {

            p = (t-d*(this.localTr.fadeIn ? i : (STR.length-1)-i))/d;
            p = clamp(p, 0, 1);
            y = -MOVE + MOVE*p + 
                Math.sin(this.stuckWave + i * Math.PI*2/STR.length) * 
                WAVE_AMPLITUDE;

            c.setGlobalAlpha(p);

            // Draw base text & shadow
            for (let j = 1; j >= 0 ; -- j) {

                if (j == 0)
                    c.setColor(...COLOR);
                else
                    c.setColor(0, 0, 0, SHADOW_ALPHA);

                c.drawScaledText(STR.charAt(i), 
                    left + i * OFFSET + SHADOW_OFF * j, 
                    my - FONT_SCALE/2 + y + SHADOW_OFF * j,
                    0, 0, 
                    FONT_SCALE, FONT_SCALE, true);
            }
        }

        c.toggleTexturing(false);
        c.setGlobalAlpha(1);
    }


    //
    // Draw the game scene
    //
    draw(c) {

        const VIEW_TARGET = 720.0;
        const SCALE_TARGET = 0.25;
        const VICTORY_SCALE = 8;
        const VICTORY_ANGLE = Math.PI / 3;

        c.clear(...BG_COLOR);

        // No textures
        c.toggleTexturing(false);

        // Scale world, maybe
        let s = 1;
        let m = 1;
        let dx = null;
        let dy = null;
        let angle = null;
        if (this.localTr.active) {

            // Set camera zoom target
            if (this.stuck == 2 && this.localTr.fadeIn) {

                dx = this.stage.startPos.x;
                dy = this.stage.startPos.y;   
                m = VICTORY_SCALE;
                angle = -VICTORY_ANGLE * this.localTr.getScaledTime();
            }

            s = this.localTr.getScaledTime();
            s = 1.0 + s * m * SCALE_TARGET* (this.localTr.fadeIn ? 1 : -1);
        }


        this.stage.setStageView(c, s, dx, dy, angle);

        // Draw stage
        this.stage.drawTiles(c, this.objMan.eggsCollected());

        // Draw game objects
        this.objMan.draw(c);

        // Reset view
        c.loadIdentity();
        c.fitViewToDimension(c.w, c.h, VIEW_TARGET);
        c.useTransform();

        // Draw local transition
        this.localTr.draw(c);
        if (this.localTr.active && this.stuck > 0) {

            this.drawStuck(c);
        }

        // Draw cogs
        this.drawCogs(c);

        // Draw stage info
        this.drawStageInfo(c);
    }
}
