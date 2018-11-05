class Hello {

    sayHello(name: string): string {
        let world = new World();
        return world.sayWrold(name);
    }
}

let hello = new Hello();
document.body.innerText = hello.sayHello("crl");