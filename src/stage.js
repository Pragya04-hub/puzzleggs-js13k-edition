import { MapData } from "./mapdata.js";
import { Shape } from "./canvas.js";

//
// Stage
// (c) 2019 Jani Nykänen
//


export class Stage {


    //
    // Constructor
    //
    constructor(id) {

        let src = MapData[id -1];

        // Decode RLE-packed data
        this.data = new Array(src.w * src.h);
        let d, len;
        let k = 0;
        for (let i = 0; i < src.data.length -1; i += 2) {

            len = src.data[i];
            d =   src.data[i+1];
            for (let j = 0; j < len; ++ j) {

                this.data[k ++] = d;
            }
        }
        this.w = src.w;
        this.h = src.h;

        // Tile dimensions (could be any, really)
        this.tileW = 64;
        this.tileH = 64;
    }


    //
    // Get a tile
    //
    getTile(x, y) {

        if (x < 0 || y < 0 || x >= this.w || y >= this.h)
            return 1; // "Wall"
        return this.data[y*this.w + x];
    }


    //
    // Set stage view
    //
    setStageView(c) {

        // Fit view
        c.fitViewToDimension(c.w, c.h, 
            this.tileH * this.h);

        // Center
        let tx = c.viewport.x / 2 - this.w*this.tileW/2;
        let ty = 0;

        c.setWorldTransform(tx, ty);
        c.useTransform();
    }


    //
    // Draw a wall tile
    //
    drawWallTile(c, x, y) {

        const LEFT = 0;
        const TOP = 1;
        const RIGHT = 2;
        const BOTTOM = 3;

        const COLORS = [
            [0.90, 0.95, 1.00],
            [0.60, 0.80, 1.00], 
            
            [0.05, 0.25, 0.60],
            [0.15, 0.45, 0.80],
            [0.33, 0.67, 1.00],
        ];

        
        let lw = this.tileW/5;
        let lh = this.tileH/5;

        let empty = [
            this.getTile(x-1, y) != 1, // Left,
            this.getTile(x, y-1) != 1, // Top
            this.getTile(x+1, y) != 1, // Right,
            this.getTile(x, y+1) != 1, // Bottom
        ]

        // Base shape
        c.setColor(...COLORS[4]);
        c.fillShape(Shape.Rect,
            x * this.tileW, y * this.tileH,
            this.tileW, this.tileH);

        // Right empty
        if (empty[RIGHT]) {

            c.setColor(...COLORS[RIGHT]);
            c.fillShape(Shape.Rect,
                x * this.tileW + (this.tileW-lw), 
                y * this.tileH,
                lw, this.tileH);
        }
        // Bottom empty
        if (empty[BOTTOM]) {

            c.setColor(...COLORS[BOTTOM]);
            c.fillShape(Shape.Rect,
                x * this.tileW , 
                y * this.tileH + (this.tileH-lh),
                this.tileW, lh);

            // Right empty
            if (empty[RIGHT]) {

                c.setColor(...COLORS[RIGHT]);
                c.fillShape(Shape.RAngledTriangle,
                    x * this.tileW + (this.tileW-lw), 
                    y * this.tileH + (this.tileH-lh),
                    -lw, -lh);
            }
        }
        // Left empty
        if (empty[LEFT]) {

            c.setColor(...COLORS[LEFT]);
            c.fillShape(Shape.Rect,
                x * this.tileW, 
                y * this.tileH,
                lw, this.tileH);

            // Bottom empty
            if (empty[BOTTOM]) {

                c.setColor(...COLORS[BOTTOM]);
                c.fillShape(Shape.RAngledTriangle,
                    x * this.tileW, 
                    y * this.tileH + (this.tileH-lh),
                    -lw, lh);
            }
        }
        // Top empty
        if (empty[TOP]) {

            c.setColor(...COLORS[TOP]);
            c.fillShape(Shape.Rect,
                x * this.tileW , 
                y * this.tileH,
                this.tileW, lh);

            // Left empty
            if (empty[LEFT]) {

                c.setColor(...COLORS[LEFT]);
                c.fillShape(Shape.RAngledTriangle,
                    x * this.tileW , 
                    y * this.tileH,
                    lw, lh);
            }
            // Right empty
            if (empty[RIGHT]) {

                c.setColor(...COLORS[RIGHT]);
                c.fillShape(Shape.RAngledTriangle,
                    x * this.tileW + (this.tileW-lw), 
                    y * this.tileH,
                    -lw, lh);
            }
        }

        //
        // Corners
        //
        const MX = [0, 1, 1, 0];
        const MY = [0, 0, 1, 1];
        const FX = [-1, -1, 1, 1];
        const FY = [-1, 1, 1, -1];
        let k, m;
        for (let i = 0; i < 4; ++ i) {

            // Check if empty
            k = MX[i];
            m = MY[i];
            if (!empty[i] && !empty[(i+1) % 4] &&
                this.getTile(x - 1 + 2 * k, y - 1 + 2 * m) != 1) {

                c.setColor(...COLORS[i]);
                c.fillShape(Shape.RAngledTriangle,
                    x * this.tileW + (this.tileW-lw) * k, 
                    y * this.tileH + (this.tileH-lh) * m,
                    lw * FX[i], lh * FY[i]);

                c.setColor(...COLORS[(i+1) % 4]);
                c.fillShape(Shape.RAngledTriangle,
                    x * this.tileW + (this.tileW-lw) * k, 
                    y * this.tileH + (this.tileH-lh) * m,
                    -lw * FX[i], -lh * FY[i]);    
            }
        }

    }


    //
    // Draw a piece of floor
    //
    drawFloorPiece(c, x, y) {

        const OUTLINE = 4;
        const SHADOW_ALPHA = 0.25;
        const SHADOW_LENGTH = 0.25;

        // For laziness
        let w = this.tileW;
        let h = this.tileH;

        // Empty tiles
        let empty = [
            this.getTile(x-1, y) != 1, // Left,
            this.getTile(x, y-1) != 1, // Top
            this.getTile(x+1, y) != 1, // Right,
            this.getTile(x, y+1) != 1, // Bottom
        ];

        // Draw base tiles
        if (x % 2 == y % 2) {

            c.setColor(0.90, 0.75, 0.50);
        }
        else {

            c.setColor(0.80, 0.55, 0.30);
        }
        c.fillShape(Shape.Rect,
            x * this.tileW, y * this.tileH,
            this.tileW, this.tileH);


        //
        // Draw shadows
        //
        c.setColor(0, 0, 0, SHADOW_ALPHA);
        let corner = this.getTile(x-1, y-1) == 1;
        let d = SHADOW_LENGTH;
        let md = 1.0 - SHADOW_LENGTH;
        // Left not empty
        if (!empty[0]) {

            // Bottom shape
            c.fillShape(Shape.Rect,
                x * this.tileW, (y + d) * this.tileH,
                this.tileW * d, this.tileH * md);

            // Upper shape
            c.fillShape( 
                (empty[1] && !corner) ? 
                    Shape.RAngledTriangle : Shape.Rect,
                x * this.tileW, y * this.tileH,
                this.tileW * d, this.tileH * d);

            // Top not empty
            if (!empty[1]) {

                c.fillShape(Shape.Rect,
                    (x + d) * this.tileW, y * this.tileH,
                    this.tileW * md, this.tileH * d);
            }
        }
        // Top not empty
        else if(!empty[1]) {

            // Left shape
            c.fillShape(
                (empty[0] && !corner) ? 
                    Shape.RAngledTriangle : Shape.Rect,
                x * this.tileW, y * this.tileH,
                -this.tileW * d, -this.tileH * d);

            // Right shape
            c.fillShape(Shape.Rect,
                (x+d) * this.tileW, y * this.tileH,
                this.tileW * md, this.tileH * d);
        }
        // Corner
        else if (corner) {

            c.fillShape(Shape.Rect,
                x * this.tileW, y * this.tileH,
                this.tileW * d, this.tileH * d);
        }


        //
        // Draw outlines
        //
        c.setColor(0, 0, 0);
        // Left
        if (!empty[0]) {

            c.fillShape(Shape.Rect, x*this.tileW, y*this.tileH,
                OUTLINE, h);
        }
        // Top
        if (!empty[1]) {

            c.fillShape(Shape.Rect, x*this.tileW, y*this.tileH,
                w, OUTLINE);
        }
        // Right
        if (!empty[2]) {

            c.fillShape(Shape.Rect, (x+1)*this.tileW-OUTLINE, y*this.tileH,
                OUTLINE, h);
        }
        // Bottom
        if (!empty[3]) {

            c.fillShape(Shape.Rect, 
                x*this.tileW, (y+1)*this.tileH-OUTLINE,
                w, OUTLINE);
        }

        //
        // Corners
        //
        const MX = [0, 1, 1, 0];
        const MY = [0, 0, 1, 1];
        let k, m;
        for (let i = 0; i < 4; ++ i) {

            // Check if empty
            k = MX[i];
            m = MY[i];
            if (empty[i] && empty[(i+1) % 4] &&
                this.getTile(x - 1 + 2 * k, y - 1 + 2 * m) == 1) {

                c.fillShape(Shape.Rect,
                    x*w + k * (w - OUTLINE),
                    y*h + m * (h - OUTLINE),
                    OUTLINE, OUTLINE);
            }
        }
    }


    //
    // Draw tiles
    //
    drawTiles(c) {

        let t = 0;
        for (let y = 0; y < this.h; ++ y) {

            for (let x = 0; x < this.w; ++ x) {

                t = this.getTile(x, y);
                
                switch(t) {

                // Wall
                case 1:
                    this.drawWallTile(c, x, y);
                    break;

                // Floor
                default:
                    this.drawFloorPiece(c, x, y);
                    break;
                }
            }
        }
    }
}
