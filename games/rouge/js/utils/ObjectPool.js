class ObjectPool {
    constructor(createFunc, resetFunc, initialSize = 10) {
        this.createFunc = createFunc;
        this.resetFunc = resetFunc;
        this.available = [];
        this.inUse = new Set();

        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.createFunc());
        }
    }

    get() {
        let obj;
        if (this.available.length > 0) {
            obj = this.available.pop();
        } else {
            obj = this.createFunc();
        }

        this.inUse.add(obj);
        this.resetFunc(obj);
        return obj;
    }

    release(obj) {
        if (this.inUse.has(obj)) {
            this.inUse.delete(obj);
            this.available.push(obj);
        }
    }

    releaseAll() {
        this.inUse.forEach(obj => {
            this.available.push(obj);
        });
        this.inUse.clear();
    }

    get size() {
        return this.available.length + this.inUse.size;
    }
}