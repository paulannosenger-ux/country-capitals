// The animated Sun of the Space tab (WebGL shaders), made to look like close-up videos of the real Sun:
// - surface: the photo texture, overlaid with boiling granulation (moving 3D noise: hot cells with darker lanes),
//   bright active regions that slowly drift, and limb darkening (the edge is darker and redder, as on the real Sun);
// - corona: a camera-facing glow around it with flickering rays and arcs (prominences) rising from the edge.
// `update(t)` moves them on (t in seconds).
import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, type Texture } from 'three'

// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT licence), shared by both shaders
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float f=0.0,a=0.5;for(int i=0;i<4;i++){f+=a*snoise(p);p*=2.03;a*=0.5;}return f;}
`

function surfaceMaterial(map: Texture) {
  return new ShaderMaterial({
    uniforms: { map: { value: map }, time: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
      void main(){
        vUv=uv; vPos=position;
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        vNormal=normalize(normalMatrix*normal); vView=normalize(-mv.xyz);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: NOISE + /* glsl */ `
      uniform sampler2D map; uniform float time;
      varying vec2 vUv; varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
      void main(){
        vec3 p=normalize(vPos);
        // granulation: small boiling cells (bright) with dark lanes between them
        float cells=snoise(p*24.0+vec3(0.0,0.0,time*0.3));
        cells+=0.35*snoise(p*48.0-vec3(time*0.45,0.0,0.0));
        float gran=smoothstep(-0.6,0.9,cells);
        // larger drifting structures: hot active regions and darker cooler patches
        float big=fbm(p*4.0+vec3(time*0.03,time*0.02,0.0));
        vec3 base=texture2D(map,vUv).rgb;
        vec3 col=mix(base,vec3(1.0,0.55,0.15),0.25)*(0.8+0.35*gran);
        col+=vec3(1.0,0.75,0.3)*smoothstep(0.25,0.7,big)*0.55;  // bright faculae
        col*=1.0-smoothstep(0.35,0.75,-big)*0.35;              // cooler patches
        // limb darkening: the edge of the disc is darker and redder
        float mu=clamp(dot(vNormal,vView),0.0,1.0);
        col*=mix(vec3(0.55,0.28,0.12),vec3(1.0),pow(mu,0.45));
        gl_FragColor=vec4(col*1.15,1.0);
      }`,
  })
}

function coronaMaterial() {
  return new ShaderMaterial({
    uniforms: { time: { value: 0 } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: NOISE + /* glsl */ `
      uniform float time; varying vec2 vUv;
      const float R=0.28; // the Sun's edge, in this square's coordinates
      void main(){
        float r=length(vUv);
        if(r<R*0.98) discard; // the Sun itself is drawn by its sphere
        float ang=atan(vUv.y,vUv.x);
        vec2 dir=vec2(cos(ang),sin(ang));
        float h=(r-R)/(1.0-R); // 0 at the edge, 1 at the outer border
        // glow fading outwards
        float glow=exp(-h*7.0)*0.9+exp(-h*2.2)*0.25;
        // flickering rays (noise along the angle, slowly changing)
        float rays=fbm(vec3(dir*3.0,time*0.15))*0.5+0.5;
        rays=pow(rays,2.0)*exp(-h*3.0)*0.9;
        // prominences: a few bright arcs/tongues near the edge, coming and going
        float prom=snoise(vec3(dir*5.0,time*0.12));
        prom=smoothstep(0.45,0.85,prom)*smoothstep(0.16,0.0,h)*(0.6+0.4*snoise(vec3(dir*14.0,time*0.4+h*8.0)));
        vec3 col=vec3(1.0,0.62,0.22)*glow+vec3(1.0,0.75,0.4)*rays+vec3(1.0,0.4,0.15)*prom*1.6;
        float a=clamp(glow+rays+prom,0.0,1.0)*smoothstep(1.0,0.75,r);
        gl_FragColor=vec4(col*a,a);
      }`,
  })
}

/** The Sun: its sphere (to tap) and the corona, which always faces the camera. */
export function makeSun(radius: number, map: Texture) {
  const ball = new Mesh(new SphereGeometry(radius, 96, 64), surfaceMaterial(map))
  const corona = new Mesh(new PlaneGeometry(1, 1), coronaMaterial())
  corona.scale.setScalar((radius / 0.28) * 2) // the corona square's edge circle (R) = the Sun's radius
  corona.renderOrder = 1
  return {
    ball,
    corona,
    update(t: number, cameraQuaternion: { x: number; y: number; z: number; w: number }) {
      ;(ball.material as ShaderMaterial).uniforms.time.value = t
      ;(corona.material as ShaderMaterial).uniforms.time.value = t
      corona.quaternion.set(cameraQuaternion.x, cameraQuaternion.y, cameraQuaternion.z, cameraQuaternion.w)
    },
  }
}
