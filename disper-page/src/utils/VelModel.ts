export default class VelModel {
    // Type all class properties
    private readonly eps: number; // Machine epsilon
    private readonly num_layers: number;
    private readonly layer_thicknesses: number[];
    private readonly densities: number[];
    private readonly vels_compression: number[];
    private readonly vels_shear: number[];
    private readonly phase_vel_min: number;
    private readonly phase_vel_max: number;
    private readonly phase_vel_delta: number;
    private phase_vel_relative_accuracy: number = 0.01;
    private max_itr: number = 100;
    private big: number = 10e10;
    private tol1: number;

    // Internal calculation variables
    private y0: number[] = [0.0, 0.0, 0.0];
    private w: number;
    private c: number;
    private c1: number;
    private c2: number;
    private c3: number;
    private vs30: number;

    constructor(
        num_layers: number,
        layer_thicknesses: number[],
        densities: number[],
        vels_compression: number[],
        vels_shear: number[],
        phase_vel_min: number,
        phase_vel_max: number,
        phase_vel_delta: number,
    ) {
        // Validate input arrays have correct length
        if (layer_thicknesses.length !== num_layers ||
            densities.length !== num_layers ||
            vels_compression.length !== num_layers ||
            vels_shear.length !== num_layers) {
            throw new Error('Input arrays must have length equal to num_layers');
        }

        this.num_layers = num_layers;
        this.layer_thicknesses = layer_thicknesses;
        this.densities = densities;
        this.vels_compression = vels_compression;
        this.vels_shear = vels_shear;
        this.phase_vel_min = phase_vel_min;
        this.phase_vel_max = phase_vel_max;
        this.phase_vel_delta = phase_vel_delta;
        this.eps = Number.EPSILON;

        // Initialize calculation variables
        //   this.z = new Array(15).fill(0.0);
        this.w = 0;
        this.c = 0;
        this.c1 = 0;
        this.c2 = 0;
        this.c3 = 0;
        //   this.ek = 0;
        this.tol1 = 0;
        this.vs30 = this.calc_vsx(30)
    }

    public get_vs30() {
        return this.vs30;
    }

    /* return rayleigh phase velocity given frequency in Hertz */
    public getc_freq(frequency: number): number | null {
        return this.raydsp(1.0 / frequency);
    }

    public getc_period(period: number): number | null {
        return this.raydsp(period);
    }

    /**
     * Calculates the average shear velocity to the given depth in meters.
     *
     * @param calcDepth Depth to calculate to.
     */
    public calc_vsx(calcDepth: number): number {
        let currentDepth = 0.0;
        let numer = 0.0;
        let denom = 0.0;
        let i = 0;
        let thickness, velShear;

        do {
            thickness = this.layer_thicknesses[i]
            if ((currentDepth + thickness) > calcDepth) {
                // Adjust thickness so we only account for the portion of the layer that is within our ROI
                thickness = calcDepth - currentDepth;
                currentDepth = calcDepth + 0.0001;
            }
            velShear = this.vels_shear[i]
            numer += thickness;
            denom += thickness / velShear;
            currentDepth += thickness
            i++;
        } while (currentDepth < calcDepth && i < this.num_layers)
        return numer / denom;
    }

    public static calc_site_class(asceVersion: string, vs30: number): string | null {
        const velFeetPerSec = vs30 * 3.28084;
        asceVersion = asceVersion.toLowerCase()
        let siteClass;
        if (asceVersion === "asce_7_16") {
            if (velFeetPerSec > 5000) {
                siteClass = "A"; // 5000 < A
            } else if (velFeetPerSec > 2500) {
                siteClass = "B"; // 2500 < B <= 5000
            } else if (velFeetPerSec > 1200) {
                siteClass = "C"; // 1200 < C <= 2500
            } else if (velFeetPerSec > 600) {
                siteClass = "D"; // 600 < D <= 1200
            } else {
                siteClass = "E"; // E <= 600
            }
        } else if (asceVersion === "asce_7_22") {
            if (velFeetPerSec > 5000) {
                siteClass = "A"; // 5000 < A
            } else if (velFeetPerSec > 3000) {
                siteClass = "B"; // 3000 < B <= 5000
            } else if (velFeetPerSec > 2100) {
                siteClass = "BC"; // 2100 < C <= 3000
            } else if (velFeetPerSec > 1450) {
                siteClass = "C"; // 1450 < C <= 2100
            } else if (velFeetPerSec > 1000) {
                siteClass = "CD"; // 1000 < C <= 1450
            } else if (velFeetPerSec > 700) {
                siteClass = "D"; // 700 < C <= 1000
            } else if (velFeetPerSec > 500) {
                siteClass = "DE"; // 500 < D <= 700
            } else {
                siteClass = "E"; // E <= 500
            }
        } else {
            siteClass = null;
        }
        return siteClass;
    }

    raydsp(period: number) {
        let f1, f2, f3, kx, cc, e, d, ff, tolc, dd, f32, f31, f21, q, s;
        let ret_code;
        this.w = 2.0 * Math.PI / period;
        this.tol1 = this.phase_vel_relative_accuracy;
        if (this.tol1 > 0.0) {
            this.tol1 = this.tol1 > this.eps ? this.tol1 : this.eps;
        }
        this.c3 = this.phase_vel_min
        //   this.ek = 0.0
        ret_code = this.raymrx(1)
        if (ret_code !== 0) {
            return null;
        }
        f3 = this.y0[2 - 1];
        if (f3 === 0 && this.tol1 > 0) {
            this.raymrx(3)
            this.c = this.c3
            return this.c;
        }

        // Find a zero cross
        kx = Math.floor((this.phase_vel_max - this.phase_vel_min) / this.phase_vel_delta + 0.5);
        kx = (kx > 1) ? kx : 1;
        cc = this.c1 = f1 = 0
        for (let k = 1; k <= kx; k++) {
            cc = this.phase_vel_min + k * this.phase_vel_delta;
            this.c1 = this.c3;
            f1 = f3;
            this.c3 = cc;
            if (this.c3 <= 0) {
                return null;
            }
            ret_code = this.raymrx(1);
            if (ret_code !== 0) {
                return null;
            }
            f3 = this.y0[2 - 1]
            if (this.tol1 <= 0)
                continue;
            if (f3 * (f1 < 0 ? -1 : 1) <= 0) {
                break;
            }
        }
        if (f3 * (f1 < 0 ? -1 : 1) > 0) {
            return null;
        }
        if (f3 === 0) {
            this.raymrx(3)
            this.c = this.c3
            return this.c;
        }
        this.c2 = this.c3;
        f2 = f3;
        e = this.c1 - this.c2
        d = e / 2.0;
        ff = tolc = dd = f32 = f31 = f21 = q = s = 0
        this.c3 = this.c2 + d
        for (let k = 1; k <= this.max_itr; k++) {
            ret_code = this.raymrx(1)
            f3 = this.y0[2 - 1]
            if (f3 * (f2 < 0 ? -1 : 1) > 0) {
                ff = this.c1;
                this.c1 = this.c2;
                this.c2 = ff;
                ff = f1;
                f1 = f2;
                f2 = ff;
            }
            if ((f3 < 0 ? -f3 : f3) > (f2 < 0 ? -f2 : f2)) {
                ff = this.c2;
                this.c2 = this.c3;
                this.c3 = ff;
                ff = f2;
                f2 = f3;
                f3 = ff;
            }
            e = this.c2 - this.c3;
            if (f3 === 0) {
                ret_code = this.raymrx(3);
                this.c = this.c3;
                return this.c;
            }

            tolc = this.c3 * this.tol1;
            dd = d;
            f32 = f3 / f2;
            f31 = f3 / f1;
            f21 = f2 / f1;
            q = f32 * (e * (1 - f31) + f21 * (f31 - f21) * (this.c1 - this.c3));
            s = (f21 - 1) * (f32 - 1) * (f31 - 1);

            // Test range
            if (q < 0) {
                s = -s;
            }
            q = q < 0 ? -q : q;
            if (q >= (e * s - (tolc * s < 0 ? -tolc * s : tolc * s))) {
                // linear interpolation
                d = e * f32 / (f32 - 1);
            } else {
                // inverse quadratic interpolation
                d = q / s;
            }
            // test convergence
            this.c1 = this.c2;
            f1 = f2;
            this.c2 = this.c3;
            f2 = f3;
            this.c3 = this.c2 + d;
            if ((e < 0 ? -e : e) <= tolc) {
                ret_code = this.raymrx(3)
                this.c = this.c3
                return this.c;
            }
            if ((d < 0 ? -d : d) <= tolc) {
                /* bisection */
                if ((dd < 0 ? -dd : dd) <= tolc) {
                    d = e / 2;
                    this.c3 = this.c2 + d;
                } else
                    this.c3 = this.c2 + (d < 0 ? -tolc : tolc);
            }
        }
        this.raymrx(3);
        this.c = this.c3;
        return this.c;
    }

    raymrx(ig: number) {
        let ii;
        let pv, r2, hk, hkk, xx, cha, chb, sha, shb, dha, dhb, aa;
        pv = r2 = hk = hkk = xx = cha = chb = sha = shb = dha = dhb = aa = 0.0;

        // Combine these declarations to avoid redeclaration
        let b11, b12, b21, c11, c12, c21, w12;
        let g1, r4, e1, e2, e3, e5, e6, f1, f2, f3, b33, b34, b43,
            b25, b15, b16, b22, b52, b23, b13, b42, b24, b14, b32,
            b31, b41, b51;
        g1 = r4 = e1 = e2 = e3 = e5 = e6 = f1 = f2 = f3 = b33 = b34 = b43 =
            b25 = b15 = b16 = b22 = b12 = b52 = b23 = b13 = b42 = b24 = b14 = b32 =
                b31 = b41 = b51 = 0.0;

        let c22, c33, c34, c43, c25, c15, c16, c52, c23, c13, c42,
            c24, c14, c32, c31, c41, c51;
        c22 = c33 = c34 = c43 = c25 = c15 = c16 = c52 = c23 = c13 = c42 =
            c24 = c14 = c32 = c31 = c41 = c51 = 0.0;

        let raac, rbbc, r1c, e1c, e3c, e5c, e6c, f1c, f2c, f3c;

        // Rename the redeclared variables to avoid conflicts
        let e1w, e3w, e5w, e6w, f1w, f2w, f3w, w33, w34, w43, w25,
            w15, w16, w22, w52, w23, w13, w42, w24, w14, w32,
            w11_final, w21_final, w31, w41, w51;
        raac = rbbc = r1c = e1c = e3c = e5c = e6c = f1c = f2c = f3c = 0;

        let jx;
        let cs = 0;
        let rbb = 0;
        let rb = 0;
        let rg = 0;
        const local_eps = this.eps;
        const local_big = this.big;
        const z = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        const local_y = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        let i = this.num_layers;
        let ro = this.densities[i - 1];
        let roc, sv, cp, raa;
        let noq;
        let z1;
        const local_c = this.c3;
        const cc = local_c * local_c;
        const wn = this.w / local_c;
        const igg = Math.max(1, (Math.min(3, ig)));
        roc = ro * cc;
        sv = this.vels_shear[i - 1]
        cp = local_c / this.vels_compression[i - 1]
        raa = (1 + cp) * (1 - cp)
        const ra = Math.sqrt(raa)
        // Assume always a solid layer
        if (sv <= 0) {
            // Liquid Bottom layer
            local_y[1 - 1] = ra * local_eps
            local_y[2 - 1] = -1 * roc * local_eps
            jx = 2;
            if (igg >= 2) {
                local_y[3 - 1] = -cp * cp * local_eps / ra;
                local_y[4 - 1] = -2 * roc * local_eps;
                jx = 4;
                if (igg > 2) {
                    jx = 6;
                }
            }
        } else {
            // Solid bottom layer
            if (local_c >= sv) {
                this.c3 = local_c;
                return -(1 >= i ? 1 : i);
            }
            cs = local_c / sv;
            rbb = (1 + cs) * (1 - cs);
            rb = Math.sqrt(rbb);
            rg = 2 * ro * this.vels_shear[i - 1] * this.vels_shear[i - 1];
            local_y[3 - 1] = -ra * local_eps;
            local_y[4 - 1] = -rb * local_eps;
            local_y[2 - 1] = -local_eps * (cp * cp * rbb + cs * cs) / (roc * (ra * rb + 1));
            local_y[1 - 1] = rg * local_y[2 - 1] + local_eps;
            local_y[5 - 1] = -rg * (local_y[1 - 1] + local_eps) + roc * local_eps;
            jx = 5;
            if (igg >= 2) {
                local_y[8 - 1] = local_eps * cp * cp / ra;
                local_y[9 - 1] = local_eps * cs * cs / rb;
                local_y[7 - 1] = -(rb * local_y[8 - 1] + ra * local_y[9 - 1]) / roc - 2 * local_y[2 - 1];
                local_y[6 - 1] = rg * local_y[7 - 1];
                local_y[10 - 1] = -rg * local_y[6 - 1] + local_eps * roc * 2;
                jx = 10;
                if (igg > 2) {
                    jx = 15;
                }
            }
        }
        // Integrate upwards through the layers
        for (ii = 2; ii <= this.num_layers; ii++) {
            i = i - 1;
            ro = this.densities[i - 1];
            roc = ro * cc;
            pv = this.vels_compression[i - 1]
            sv = this.vels_shear[i - 1]
            for (let j = 0; j < z.length; j++) {
                z[j] = local_y[j];
            }
            // Check if a solid->liquid or liquid->solid transition
            // ***IGNORING THESE CASES FOR NOW! ASSUMING ALWAYS SOLID
            r2 = 1 / roc;
            cp = local_c / pv
            raa = (1 + cp) * (1 - cp);
            cs = 0;
            if (sv > 0) {
                cs = local_c / sv
            }
            rbb = (1 + cs) * (1 - cs);
            hk = this.layer_thicknesses[i - 1] * wn;
            hkk = hk * hk;
            xx = raa * hkk;
            noq = 1;
            for (let k = 1; k <= 2; k++) {
                cha = chb
                sha = shb
                dha = dhb
                aa = xx < 0 ? -1 * xx : xx;
                if (aa <= 1) {
                    shb = this.sh0(xx);
                    chb = 1 + xx * this.sh0(xx / 4)
                        * this.sh0(xx / 4) / 2;
                    if (igg >= 2)
                        dhb = this.sh1(xx) * hkk;
                } else {
                    aa = Math.sqrt(aa);
                    if (xx <= 0) {
                        chb = Math.cos(aa);
                        shb = Math.sin(aa) / aa;
                    } else {
                        if (aa > 100) {
                            noq = 0;
                        }
                        if (aa <= 100) {
                            noq = noq / Math.cosh(aa);
                        }
                        chb = 1;
                        shb = Math.tanh(aa) / aa;
                    }
                    if (igg >= 2) {
                        dhb = (hkk / xx) * (chb - shb);
                    }
                }
                xx = hkk * rbb;
                shb = hk * shb;
            }
            if (sv <= 0) {
                // Ignore liquid layers
                return null
            } else {
                // Solid layer math
                g1 = 2 / cs / cs;
                rg = g1 * roc;
                r4 = rg - roc;
                e1 = cha * chb;
                e2 = e1 - noq;
                e3 = sha * shb;
                e5 = sha * chb;
                e6 = shb * cha;
                f1 = e2 - e3;
                f2 = r2 * f1;
                f3 = g1 * f1 + e3;
                b33 = e1;
                b34 = raa * e3;
                b43 = rbb * e3;
                b25 = -r2 * (f2 + r2 * (e2 - raa * b43));
                b15 = rg * b25 + f2;
                b16 = -rg * b15 - f3;
                b22 = b16 + e1;
                b12 = rg * b16 - r4 * f3;
                b52 = -rg * b12 + r4 * (rg * f3 + r4 * e3);
                b23 = r2 * (e5 - rbb * e6);
                b13 = rg * b23 - e5;
                b42 = -rg * b13 + r4 * e5;
                b24 = r2 * (e6 - raa * e5);
                b14 = rg * b24 - e6;
                b32 = -rg * b14 + r4 * e6;
                b11 = noq - b16 - b16;
                b21 = b15 + b15;
                b31 = b14 + b14;
                b41 = b13 + b13;
                b51 = b12 + b12;

                local_y[1 - 1] = b11 * z[1 - 1] + b12 * z[2 - 1] + b13 * z[3 - 1]
                    + b14 * z[4 - 1] + b15 * z[5 - 1];
                local_y[2 - 1] = b21 * z[1 - 1] + b22 * z[2 - 1] + b23 * z[3 - 1]
                    + b24 * z[4 - 1] + b25 * z[5 - 1];
                local_y[3 - 1] = b31 * z[1 - 1] + b32 * z[2 - 1] + b33 * z[3 - 1]
                    + b34 * z[4 - 1] + b24 * z[5 - 1];
                local_y[4 - 1] = b41 * z[1 - 1] + b42 * z[2 - 1] + b43 * z[3 - 1]
                    + b33 * z[4 - 1] + b23 * z[5 - 1];
                local_y[5 - 1] = b51 * z[1 - 1] + b52 * z[2 - 1] + b42 * z[3 - 1]
                    + b32 * z[4 - 1] + b22 * z[5 - 1];
                if (igg >= 2) {
                    raac = -2 * cp * cp;
                    rbbc = -2 * cs * cs;
                    r1c = roc + roc;
                    e1c = -hk * (e5 + e6);
                    e3c = -e3 - e3 - hk * (dha * shb + dhb * sha);
                    e5c = -e5 - hk * (dha * chb + e3);
                    e6c = -e6 - hk * (dhb * cha + e3);
                    f1c = e1c - e3c;
                    f2c = r2 * (f1c - f1 - f1);
                    f3c = g1 * (f1c - f1 - f1) + e3c;
                    c33 = e1c;
                    c34 = raa * e3c + raac * e3;
                    c43 = rbb * e3c + rbbc * e3;
                    c25 = -r2 * (f2c + r2 * (e1c - raa * c43 - raac * b43))
                        - 2 * (b25 + b25 + r2 * f2);
                    c15 = rg * c25 + f2c;
                    c16 = -rg * c15 - f3c;
                    c22 = c16 + e1c;
                    c12 = rg * c16 + r1c * f3 - r4 * f3c;
                    c52 = -rg * c12 + r4 * (rg * f3c + r4 * e3c)
                        - r1c * (rg * f3 + 2 * r4 * e3);
                    c23 = r2 * (e5c - rbb * e6c - rbbc * e6) - b23 - b23;
                    c13 = rg * c23 - e5c;
                    c42 = -rg * c13 + r4 * e5c - r1c * e5;
                    c24 = r2 * (e6c - raa * e5c - raac * e5) - b24 - b24;
                    c14 = rg * c24 - e6c;
                    c32 = -rg * c14 + r4 * e6c - r1c * e6;
                    c11 = -c16 - c16;
                    c21 = c15 + c15;
                    c31 = c14 + c14;
                    c41 = c13 + c13;
                    c51 = c12 + c12;
                    local_y[6 - 1] = b11 * z[6 - 1] + b12 * z[7 - 1] + b13 * z[8 - 1]
                        + b14 * z[9 - 1] + b15 * z[10 - 1]
                        + c11 * z[1 - 1] + c12 * z[2 - 1] + c13 * z[3 - 1]
                        + c14 * z[4 - 1] + c15 * z[5 - 1];
                    local_y[7 - 1] = b21 * z[6 - 1] + b22 * z[7 - 1] + b23 * z[8 - 1]
                        + b24 * z[9 - 1] + b25 * z[10 - 1]
                        + c21 * z[1 - 1] + c22 * z[2 - 1] + c23 * z[3 - 1]
                        + c24 * z[4 - 1] + c25 * z[5 - 1];
                    local_y[8 - 1] = b31 * z[6 - 1] + b32 * z[7 - 1] + b33 * z[8 - 1]
                        + b34 * z[9 - 1] + b24 * z[10 - 1]
                        + c31 * z[1 - 1] + c32 * z[2 - 1] + c33 * z[3 - 1]
                        + c34 * z[4 - 1] + c24 * z[5 - 1];
                    local_y[9 - 1] = b41 * z[6 - 1] + b42 * z[7 - 1] + b43 * z[8 - 1]
                        + b33 * z[9 - 1] + b23 * z[10 - 1]
                        + c41 * z[1 - 1] + c42 * z[2 - 1] + c43 * z[3 - 1]
                        + c33 * z[4 - 1] + c23 * z[5 - 1];
                    local_y[10 - 1] = b51 * z[6 - 1] + b52 * z[7 - 1] + b42 * z[8 - 1]
                        + b32 * z[9 - 1] + b22 * z[10 - 1]
                        + c51 * z[1 - 1] + c52 * z[2 - 1] + c42 * z[3 - 1]
                        + c32 * z[4 - 1] + c22 * z[5 - 1];
                    if (igg > 2) {
                        e1w = hk * (raa * e5 + rbb * e6);
                        e3w = hk * (e5 + e6);
                        e5w = hk * (e1 + b43);
                        e6w = hk * (e1 + b34);
                        f1w = e1w - e3w;
                        f2w = r2 * f1w;
                        f3w = g1 * f1w + e3w;
                        w33 = e1w;
                        w34 = raa * e3w;
                        w43 = rbb * e3w;
                        w25 = -r2 * (f2w + r2 * (e1w - raa * w43));
                        w15 = rg * w25 + f2w;
                        w16 = -rg * w15 - f3w;
                        w22 = w16 + e1w;
                        w12 = rg * w16 - r4 * f3w;
                        w52 = -rg * w12 + r4 * (rg * f3w + r4 * e3w);
                        w23 = r2 * (e5w - rbb * e6w);
                        w13 = rg * w23 - e5w;
                        w42 = -rg * w13 + r4 * e5w;
                        w24 = r2 * (e6w - raa * e5w);
                        w14 = rg * w24 - e6w;
                        w32 = -rg * w14 + r4 * e6w;
                        w11_final = -w16 - w16;
                        w21_final = w15 + w15;
                        w31 = w14 + w14;
                        w41 = w13 + w13;
                        w51 = w12 + w12;

                        local_y[11 - 1] = b11 * z[11 - 1] + b12 * z[12 - 1] + b13 * z[13 - 1]
                            + b14 * z[14 - 1] + b15 * z[15 - 1]
                            + w11_final * z[1 - 1] + w12 * z[2 - 1] + w13 * z[3 - 1]
                            + w14 * z[4 - 1] + w15 * z[5 - 1];
                        local_y[12 - 1] = b21 * z[11 - 1] + b22 * z[12 - 1] + b23 * z[13 - 1]
                            + b24 * z[14 - 1] + b25 * z[15 - 1]
                            + w21_final * z[1 - 1] + w22 * z[2 - 1] + w23 * z[3 - 1]
                            + w24 * z[4 - 1] + w25 * z[5 - 1];
                        local_y[13 - 1] = b31 * z[11 - 1] + b32 * z[12 - 1] + b33 * z[13 - 1]
                            + b34 * z[14 - 1] + b24 * z[15 - 1]
                            + w31 * z[1 - 1] + w32 * z[2 - 1] + w33 * z[3 - 1]
                            + w34 * z[4 - 1] + w24 * z[5 - 1];
                        local_y[14 - 1] = b41 * z[11 - 1] + b42 * z[12 - 1] + b43 * z[13 - 1]
                            + b33 * z[14 - 1] + b23 * z[15 - 1]
                            + w41 * z[1 - 1] + w42 * z[2 - 1] + w43 * z[3 - 1]
                            + w33 * z[4 - 1] + w23 * z[5 - 1];
                        local_y[15 - 1] = b51 * z[11 - 1] + b52 * z[12 - 1] + b42 * z[13 - 1]
                            + b32 * z[14 - 1] + b22 * z[15 - 1]
                            + w51 * z[1 - 1] + w52 * z[2 - 1] + w42 * z[3 - 1]
                            + w32 * z[4 - 1] + w22 * z[5 - 1];
                    }
                }
            }
        }
        /* normalization */
        z1 = 0;
        for (let j = 0; j < jx; j++) {
            z1 = Math.max(z1, local_y[j] < 0 ? -local_y[j] : local_y[j]);
        }
        if (z1 > local_big) {
            for (let j = 0; j < jx; j++) {
                local_y[j] = local_eps * local_y[j];
            }
        }

        // Exit
        if (sv <= 0) {
            /* liquid surface */
            this.y0[0] = local_y[0];
            if (Math.abs(local_y[1]) * local_eps <= Math.abs(local_y[0])) {
                this.y0[1] = local_y[1] / Math.abs(local_y[0]);
            } else {
                this.y0[1] = this.sign(local_big, local_y[1]);
            }
            if (igg >= 2) {
                //   this.ek = -wn * local_y[3] / local_y[0];
            }
        } else {
            /* solid surface */
            this.y0[0] = local_y[2];
            if (Math.abs(local_y[4]) * local_eps <= Math.abs(local_y[2])) {
                this.y0[1] = local_y[4] / Math.abs(local_y[2]);
                this.y0[2] = -local_y[0] / local_y[2];
            } else
                this.y0[1] = this.sign(local_big, local_y[4]);
            if (igg >= 2) {
                //   this.ek = -wn * local_y[9] / local_y[2];
            }
        }

        return 0;
    }

    sh0(x: number) {
        return 1.0e0 + x * (1.666666666666667e-1
            + x * (8.3333333333340e-3
                + x * (1.984126984127e-4
                    + x * (2.7557319189e-6 + x * (2.50121084e-8
                        + x * (1.605961e-10 + x * 7.647e-13))))));
    }

    sh1(x: number) {
        return 3.333333333333333e-1
            + x * (3.33333333333333e-2
                + x * (1.1904761904762e-3
                    + x * (2.20458553792e-5
                        + x * (2.505210837e-7 + x * (1.9270853e-9
                            + x * (1.07063e-11 + x * 4.50e-14))))));
    }

    sign(x: number, y: number) {
        if (x < 0) {
            if (y < 0)
                return x;
            return -x;
        }
        if (y < 0)
            return -x;
        return x;
    }
}