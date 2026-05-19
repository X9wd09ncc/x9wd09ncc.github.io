class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static zero() {
        return new Vector2(0, 0);
    }

    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    static distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static lerp(a, b, t) {
        return new Vector2(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t
        );
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return Vector2.zero();
        return this.divide(mag);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    clone() {
        return new Vector2(this.x, this.y);
    }
}