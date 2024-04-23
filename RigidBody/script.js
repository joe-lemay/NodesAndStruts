const c = document.getElementById("canvas1");
const ctx = c.getContext("2d");

c.height = 800;
c.width = 1800;

let currentPen = "node";
let curMouseX;
let curMouseY;

let nodeRadius = 5;
let nodeMass = 5;
let maxForce = 100;

let timeStep = 0.1;
let bounceDrag = 0.85;
let isRunning = true;
let isPaused = false;
let friction = 0.75;
let gravity = 0.2;

let actions = [];

let selectedNodes = [];

function pickNode(){
    currentPen = "node"
}

function pickCon(){
    currentPen = "connector"
}

function getMouse(evt){
    let rect = c.getBoundingClientRect();
    curMouseX = evt.clientX - rect.left;
    curMouseY = evt.clientY - rect.top;
}

function undoObject(){
    if(actions[actions.length-1] == "node"){
        Node.allNodes.pop();
        actions.pop();
    }
    if(actions[actions.length-1] == "strut"){
        Strut.allStruts.pop();
        actions.pop();
    }
}

class Node{
    static allNodes = [];
    constructor(data){
        this.pos = {x:data.xp, y:data.yp};
        this.vel = {x:0, y:0}
        this.r = data.r;
        this.m = data.m;
        this.active = false;
        Node.allNodes.push(this);
    }

    updateNode(){
        console.log(this.pos.y)
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        if (this.pos.x > c.width-20) { this.vel.x *= -1 * bounceDrag };
        if (this.pos.x < 20) {this.vel.x *= -1 * bounceDrag};
        if (this.pos.y > c.height-20) { 
            this.vel.y *= -1 * bounceDrag;
            this.pos.y-=0.25;
            this.vel.x *= friction;
            this.vel.y *= friction;
        };
        if (this.pos.y < 20) {
            this.vel.y *= -1 * bounceDrag;
            this.vel.y +=25;
        }
        };

    drawNode(thisCanvas){
        if(this.active){
            thisCanvas.lineWidth = 6;
            thisCanvas.strokeStyle = "#EE0700"
        }else{
            thisCanvas.lineWidth = 3;
            thisCanvas.strokeStyle = "black"
        }
        if(isPaused){
            thisCanvas.beginPath();
            thisCanvas.arc(this.pos.x, this.pos.y, this.r+10, 0, Math.PI * 2);
            thisCanvas.stroke();
        }else{
            thisCanvas.beginPath();
            thisCanvas.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
            thisCanvas.stroke();
        }
    }

    static shiftNodes(){
        Node.allNodes.forEach(node=>{
            if(node.pos.y<20){
                node.pos.y=20
            }
        });
    }
}

function drawNodes(canvas){
    Node.allNodes.forEach(node=>{
        node.drawNode(canvas);
    });
}

function drawWorld(canvas){
    canvas.strokeStyle="black";
    canvas.lineWidth = 5;
    canvas.beginPath();
    canvas.moveTo(0, c.height-40);
    canvas.lineTo(c.width, c.height-40);
    canvas.stroke();
}

function updateNodes(){
    Node.allNodes.forEach(node=>{
        node.updateNode();
    });
}

class Strut{
    static allStruts = []
    constructor(data){
        this.n1 = data.n1;//Node 1
        this.n2 = data.n2;//Node 2
        this.len = this.calculateLength();
        this.stif = data.stif;//Stiffness
        this.color = data.color;
        this.maxForce = maxForce;
        this.damp = 0.95;
        this.isBroken = false;
        Strut.allStruts.push(this);
    }

    calculateLength(){
        const dx = this.n2.pos.x - this.n1.pos.x;
        const dy = this.n2.pos.y - this.n1.pos.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    findColor(force){
        let r = Math.floor(force/this.maxForce * 255)
        if(r<50){r=25}
        let g = Math.floor(255-r);
        if(g<50){g=50};
        g = g.toString(16)
        r = r.toString(16)
        r = r.padStart(2, '0');
        let b = "00";
        this.color = "#"+r+g+b
    }

    calculateForce(){
        const dx = this.n2.pos.x - this.n1.pos.x;
        const dy = this.n2.pos.y - this.n1.pos.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const force = this.stif * (distance - this.len)*this.damp;
        if(Math.abs(force) > this.maxForce){
            this.isBroken = true;
        }
        let sudoForce = Math.abs(force);
        if(sudoForce > this.maxForce){sudoForce=this.maxForce}
        this.findColor(sudoForce);
        const fx = force * dx / distance;
        const fy = force * dy / distance;
        this.n1.vel.x += fx / this.n1.m * timeStep;
        this.n1.vel.y += fy / this.n1.m * timeStep;
        this.n2.vel.x -= fx / this.n2.m * timeStep;
        this.n2.vel.y -= fy / this.n2.m * timeStep;
    }

    drawStrut(){
        ctx.lineWidth = 10;
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.n1.pos.x, this.n1.pos.y);
        ctx.lineTo(this.n2.pos.x, this.n2.pos.y);
        ctx.stroke();
    }
}

function removeBreaks(){
    for(let i in Strut.allStruts){
        if(Strut.allStruts[i].isBroken == true){
            Strut.allStruts.splice(i,1);
        }
    }
}

function updateForces(){
    Strut.allStruts.forEach(strut=>{
        strut.calculateForce();
    });
}

function checkForStrut(){
    if(selectedNodes.length>1){
        let n1 = selectedNodes[0];
        let n2 = selectedNodes[1];
        if(n1==n2){
            selectedNodes = [];
            return
        }
        let strutData = {
            n1: n1,
            n2: n2,
            stif: 10,
            color: "black"
        }
        new Strut(strutData);
        actions.push("strut")
        Node.allNodes.forEach(node =>{
            node.active = false;
        });
        
        selectedNodes = [];
    }
}

function drawStruts(canvas){
    Strut.allStruts.forEach(strut=>{
        strut.drawStrut(canvas)
    });
}

function checkForNode(mouseX, mouseY){
    Node.allNodes.forEach(node=>{
        let xDiff = mouseX - node.pos.x;
        let yDiff = mouseY - node.pos.y;
        let dist = Math.abs(Math.sqrt((xDiff*xDiff)-(yDiff*yDiff)));
        if(dist<= node.r+10){
            node.active = true;
            selectedNodes.push(node);
        }
    });
}

function createObject(evt){
    let rect = c.getBoundingClientRect();
    let mouseX = evt.clientX - rect.left;
    let mouseY = evt.clientY - rect.top;
    if(currentPen=="node"){
        nodeData = {
            xp: mouseX,
            yp: mouseY,
            r: nodeRadius,
            m: nodeMass
        }
        new Node(nodeData);
        actions.push("node");

    }
    if(currentPen=="connector"){
        checkForNode(mouseX, mouseY)
    }
}

// function createNode(evt){
//     let rect = c.getBoundingClientRect();
//     let mouseX = evt.clientX - rect.left;
//     let mouseY = evt.clientY - rect.top;
//     let nodeData = {
//         xp: mouseX,
//         yp: mouseY,
//         xv: 0,
//         yv: 0,
//         r: nodeRadius,
//         m: nodeMass
//     };
//     new Node(nodeData)
//     if(Node.allNodes.length==2){
//         let n1 = Node.allNodes[Node.allNodes.length-1];
//         let n2 = Node.allNodes[Node.allNodes.length-2];
//         let strutData = {
//             n1: n1,
//             n2: n2,
//             stif: 10
//         }
//         new Strut(strutData)
//     }
//     if(Node.allNodes.length>3){Strut.allStruts.pop();}
//     if(Node.allNodes.length>=3){
//         let n1 = Node.allNodes[Node.allNodes.length-1];
//         let n2 = Node.allNodes[Node.allNodes.length-2];
//         let strut1Data = {
//             n1: n1,
//             n2: n2,
//             stif: 10
//         }
//         new Strut(strut1Data)
//         let n3 = Node.allNodes[Node.allNodes.length-1];
//         let n4 = Node.allNodes[0];
//         let strut2Data = {
//             n1: n3,
//             n2: n4,
//             stif: 10
//         }
//         new Strut(strut2Data)
//     }
// }

function updateGravity(){
    Node.allNodes.forEach(node=>{
        node.vel.y += gravity*timeStep;
    });
}

function updateFriction(){
    Node.allNodes.forEach(node=>{
        node.vel.y *= friction;
        node.vel.x *= friction;
    });
}

function pauseButton(){
    if(isPaused){
        isPaused = false
    }else{
        isPaused = true
    }
}


function animate(running) {
    ctx.clearRect(0, 0, 1920, 1080);
    drawWorld(ctx);
    if(!isPaused){
        updateNodes();
        updateGravity();
        updateForces();
        // updateFriction();
        removeBreaks();
    }
    Node.shiftNodes();
    checkForStrut();
    drawNodes(ctx);
    drawStruts(ctx);
    if(running){
        requestAnimationFrame(animate);
    }
}
animate(isRunning);
