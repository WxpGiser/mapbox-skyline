precision mediump float;
attribute vec2 a_pos;
attribute vec4 a_color;
//uniform mat4 u_matrix;
uniform vec4 u_size;
uniform float u_heightScale;
varying  vec4 v_color;

void main() {
    vec2 pos = vec2(a_pos.x/u_size.x,a_pos.y/u_size.y);
    pos.y *= u_heightScale;
    pos *=2.0;
    pos -=1.0;
    pos.y = -pos.y;
    float z = a_pos.y==0.0 ? u_size.z : u_size.w;
    gl_Position = vec4(pos, z, 1);
    v_color = a_color/255.0;
}
