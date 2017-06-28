precision mediump float;
varying  vec4 v_color;

void main() {
    gl_FragColor = v_color;
    gl_FragColor.a = 1.0;
    //gl_FragColor = vec4(gl_FragCoord.z,0,0,1.0);
}
