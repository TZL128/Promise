
const STATE_PENDING = 'pending';
const STATE_FULFILLED = 'fulfilled';
const STATE_REJECTED = 'rejected';


function Promise(actuator) {

    this.state = STATE_PENDING;
    this.value = undefined;
    this.callBack = []

    const onResolve = value => {
        if (this.state === STATE_PENDING) {
            this.state = STATE_FULFILLED;
            this.value = value;
            //加入微任务
            queueMicrotask(() => {
                this.callBack.forEach(p => {
                    p.onResolve(this.value)
                })
            })

        }
    }

    const onReject = reason => {
        if (this.state === STATE_PENDING) {
            this.state = STATE_REJECTED;
            this.value = reason;
            queueMicrotask(() => {
                this.callBack.forEach(p => {
                    p.onReject(this.value)
                })
            })

        }
    }

    try {
        actuator(onResolve, onReject);
    } catch (error) {
        onReject(error)
    }

}


Promise.prototype.then = function (onResolve, onReject) {

    //处理异常穿透 
    /**
     * p.then(value=>{
     * }).then(value=>{
     * }).catch(err=>{
     * })
     */
    if (typeof onReject !== 'function') {
        onReject = reason => {
            throw reason
        }
    }

    //处理值穿透
    /**
     * p.then()
     *  .then(value=>{
     *  })
     */
    if (typeof onResolve !== 'function') {
        onResolve = value => value
    }

    return new Promise((resolve, reject) => {
        const func = (cb, value) => {
            try {
                queueMicrotask(() => {
                    let result = cb(value);
                    // if (result instanceof Promise) {
                    //     resolve(result)
                    // } else {
                    //     resolve(result)
                    // }
                    if (result instanceof Promise) {
                        result.then(resolve, reject)
                        // result.then(value => {
                        //     resolve(value)
                        // }, e => {
                        //     reject(e)

                        // })
                    } else {
                        resolve(result)

                    }
                })

            } catch (error) {
                reject(error)
            }
        }
        if (this.state === STATE_FULFILLED) {
            func(onResolve, this.value)

        }
        if (this.state === STATE_REJECTED) {
            func(onReject, this.value)
        }
        if (this.state === STATE_PENDING) {
            this.callBack.push({
                onResolve: value => {
                    func(onResolve, value)
                },
                onReject: reason => {
                    func(onReject, reason)
                }
            });
        }
    })

}


Promise.prototype.catch = function (onReject) {
    return this.then(undefined, onReject)
}

Promise.resolve = function (value) {
    return new Promise((resolve, reject) => {
        if (value instanceof Promise) {
            value.then(resolve, reject)
        } else {
            resolve(value)
        }
    })
}

Promise.reject = function (reason) {
    return new Promise((resolve, reject) => {
        reject(reason)
    })
}

Promise.all = function (list) {
    let count = 0, result = [];
    let { length } = list;
    return new Promise((resolve, reject) => {
        if (length === 0) {
            resolve(result)
        } else {
            list.forEach((p, i) => {
                if (p instanceof Promise) {
                    p.then(value => {
                        count++;
                        result[i] = value;
                        if (count === length) {
                            resolve(result)
                        }
                    }, reject)
                } else {
                    count++;
                    result[i] = p;
                }

            })
        }
    })
}

Promise.race = function (list) {
    return new Promise((resolve, reject) => {
        list.forEach(p => {
            if (p instanceof Promise) {
                p.then(resolve, reject)
            } else {
                resolve(p);
            }
        })
    })
}
