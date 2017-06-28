'use strict';

const fs = require('fs');
const path = require('path');
const createElementArrayType = require('../data/element_array_type');
const assert = require('assert');
const Buffer = require('../data/buffer');
const createVertexArrayType = require('../data/vertex_array_type');
const VertexArrayObject = require('../render/vertex_array_object');
const LngLat = require('../geo/lng_lat'),
    Point = require('point-geometry'),
    Coordinate = require('../geo/coordinate');

const glmatrix = require('@mapbox/gl-matrix');
const vec4 = glmatrix.vec4;

const skylineShader =  {
    fragmentSource: fs.readFileSync(path.join(__dirname, '../shaders/skyline.fragment.glsl'), 'utf8'),
    vertexSource: fs.readFileSync(path.join(__dirname, '../shaders/skyline.vertex.glsl'), 'utf8')
};


const layoutAttributes = [
    {name: 'a_pos',  components: 2, type: 'Int16'},
    {name: 'a_color',components: 4, type: 'Uint8'}
];

const LayoutVertexArrayType = createVertexArrayType(layoutAttributes);

class Skyline {
    constructor(gl,transform)
    {
        this.gl = gl;
        this.color0 = [10,75,185,255];
        this.color1 = [190,215.230,255];
        this.colors = [];
        this.colors.push("#0A4BB9");//10,75.185
        this.colors.push("#BED7E6");//190,215.230
        this.height = 150;

        //this.arrays = new ArrayGroup(programInterface,[]);
        this.vao = null;

        this.layoutVertexArray = new LayoutVertexArrayType();
        this.transform = transform;

        this.init();
        this.createVertex();
        this.createBuffer();
        this.skylineProgram = this.createProgram();
    }

    destroy() {
        if(this.vao)
            this.vao.destroy();
    }

    resize()
    {
        this.destroy();

        this.init();

        this.layoutVertexArray = new LayoutVertexArrayType();
        this.createVertex();
        this.createBuffer();
    }

    init()
    {
        const curPitch = this.transform.pitch;
        this.transform.pitch = 60;
        var pc = this.transform.pointCoordinate(new Point(this.transform.width/2,this.height));
        var cl = this.transform.coordinateLocation(pc);
        const x = this.transform.lngX(cl.lng);
        const y = this.transform.latY(cl.lat);
        // const temp = [x, y, 0, 1];
        // vec4.transformMat4(temp, temp, this.transform.projMatrix);
        // this.zValueLow = temp[2] / temp[3];

        const centerX = this.transform.x;
        const centerY = this.transform.y;

        this.diffPoint = new Point(x - centerX,y - centerY);

        this.firstAngle = this.transform.angle;

        this.transform.pitch = curPitch;


        //this.zValue = this.transform.calculatePointZValue(new Point(this.transform.width/2,this.height),60);
    }

    createVertex()
    {
        var width = this.transform.width;

        const layoutVertexArray = this.layoutVertexArray;
        //const elementArray = this.arrays.elementArray;
        //const segment = this.arrays.prepareSegment(4);
        //const index = segment.vertexLength;

        layoutVertexArray.emplaceBack(0, 0,this.color0[0],this.color0[1],this.color0[2],this.color0[3]);
        layoutVertexArray.emplaceBack(width, 0,this.color0[0],this.color0[1],this.color0[2],this.color0[3]);
        layoutVertexArray.emplaceBack(0, this.height,this.color1[0],this.color1[1],this.color1[2],this.color1[3]);

        layoutVertexArray.emplaceBack(width, 0,this.color0[0],this.color0[1],this.color0[2],this.color0[3]);
        layoutVertexArray.emplaceBack(0, this.height,this.color1[0],this.color1[1],this.color1[2],this.color1[3]);
        layoutVertexArray.emplaceBack(width, this.height,this.color1[0],this.color1[1],this.color1[2],this.color1[3]);

        //elementArray.emplaceBack(index, index + 1, index + 2);
        //elementArray.emplaceBack(index + 1, index + 2, index + 3);

        //segment.vertexLength += 4;
        //segment.primitiveLength += 2;
    }

    createBuffer()
    {
        //const arrays = this.arrays;
        //this.buffers = new BufferGroup(programInterface, [], undefined, this.arrays);
        // const LayoutVertexArrayType = createVertexArrayType(programInterface.layoutAttributes);
        // this.layoutVertexBuffer = new Buffer(arrays.layoutVertexArray,
        //     LayoutVertexArrayType.serialize(), Buffer.BufferType.VERTEX);
        this.layoutVertexBuffer = Buffer.fromStructArray(this.layoutVertexArray,Buffer.BufferType.VERTEX);

        if(this.vao == null)
            this.vao = new VertexArrayObject();

        //if (arrays.elementArray) {
            //this.elementBuffer = new Buffer(arrays.elementArray,
            //    programInterface.elementArrayType.serialize(), Buffer.BufferType.ELEMENT);
            //this.elementBuffer = Buffer.fromStructArray(arrays.elementArray,Buffer.BufferType.ELEMENT);
        //}
    }

    createProgram() {
        const gl = this.gl;
        const program = gl.createProgram();

        const fragmentSource = skylineShader.fragmentSource;
        const vertexSource = skylineShader.vertexSource;

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        assert(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS), gl.getShaderInfoLog(fragmentShader));
        gl.attachShader(program, fragmentShader);

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        assert(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS), gl.getShaderInfoLog(vertexShader));
        gl.attachShader(program, vertexShader);

        gl.linkProgram(program);
        assert(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program));

        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        const result = {program, numAttributes};

        for (let i = 0; i < numAttributes; i++) {
            const attribute = gl.getActiveAttrib(program, i);
            result[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            result[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        return result;
    }

    render()
    {
        //console.time("render time");

        const diffAngle = this.transform.angle - this.firstAngle;
        const p = this.diffPoint.rotate(-diffAngle);
        const centerX = this.transform.x;
        const centerY = this.transform.y;
        const skylinePtX = p.x + centerX;
        const skylinePtY = p.y + centerY;
        const lp = this.transform.locationPoint(new LngLat(this.transform.xLng(skylinePtX),this.transform.yLat(skylinePtY)));
        if(lp.y < 0)
            return;
        var heightScale = lp.y/this.height;


        const cameraToCenterDistance = 0.5 / Math.tan(this.transform._fov / 2) * this.transform.height;
        const cameraAltitude = cameraToCenterDistance * Math.cos(this.transform._pitch);
        const centerToAltitudePt = cameraToCenterDistance * Math.sin(this.transform._pitch);
        const halfFov = this.transform._fov / 2;
        const groundAngle = Math.PI / 2 + this.transform._pitch;
        const topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
        const diff = topHalfSurfaceDistance - p.mag();
        const zHeight = diff/(topHalfSurfaceDistance + centerToAltitudePt) * cameraAltitude;

        var temp = [skylinePtX, skylinePtY, 0, 1];
        vec4.transformMat4(temp, temp, this.transform.projMatrix);
        this.zValueScreenLow = temp[2] / temp[3];

        temp = [skylinePtX, skylinePtY, zHeight, 1];
        vec4.transformMat4(temp, temp, this.transform.projMatrix);
        this.zValueScreenHigh = temp[2] / temp[3];

        const gl = this.gl;

        //gl.depthRange(0, 1);
        //gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.DEPTH_TEST);

        //gl.disable(gl.CULL_FACE);

        gl.useProgram(this.skylineProgram.program);
        gl.uniform4f(this.skylineProgram.u_size, this.transform.width, this.transform.height,this.zValueScreenHigh,this.zValueScreenLow);
        gl.uniform1f(this.skylineProgram.u_heightScale, heightScale);

        //this.layoutVertexBuffer.enableAttributes(gl, this.skylineProgram);
        //this.layoutVertexBuffer.bind(gl);
        //this.layoutVertexBuffer.setVertexAttribPointers(gl, this.skylineProgram, 0);//segment.vertexOffset
        this.vao.bind(this.gl, this.skylineProgram, this.layoutVertexBuffer);
        //this.elementBuffer.bind(gl);
        //gl.drawElements(gl.TRIANGLES, segment.primitiveLength * 3, gl.UNSIGNED_SHORT, segment.primitiveOffset * 3 * 2);
        gl.drawArrays(gl.TRIANGLES, 0, 6);//segment.vertexLength

        //console.timeEnd("render time");
    }
}

module.exports = Skyline;
