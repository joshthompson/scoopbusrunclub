import{ao as je,ap as we,v as Se,y as Vt,ak as Qe,C as U,K as Re,ad as te,A as at,D as Xt,X as P,Y as ye,t as st,Z as Zt}from"./BusModel-Bc1SFqB6.js";function $e(t,o,e=2){const n=o&&o.length,s=n?o[0]*e:t.length;let i=Be(t,0,s,e,!0);const a=[];if(!i||i.next===i.prev)return a;let r,l,c;if(n&&(i=no(t,o,i,e)),t.length>80*e){r=t[0],l=t[1];let _=r,f=l;for(let u=e;u<s;u+=e){const E=t[u],h=t[u+1];E<r&&(r=E),h<l&&(l=h),E>_&&(_=E),h>f&&(f=h)}c=Math.max(_-r,f-l),c=c!==0?32767/c:0}return vt(i,a,e,r,l,c,0),a}function Be(t,o,e,n,s){let i;if(s===mo(t,o,e,n)>0)for(let a=o;a<e;a+=n)i=be(a/n|0,t[a],t[a+1],i);else for(let a=e-n;a>=o;a-=n)i=be(a/n|0,t[a],t[a+1],i);return i&&xt(i,i.next)&&(yt(i),i=i.next),i}function mt(t,o){if(!t)return t;o||(o=t);let e=t,n;do if(n=!1,!e.steiner&&(xt(e,e.next)||B(e.prev,e,e.next)===0)){if(yt(e),e=o=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==o);return o}function vt(t,o,e,n,s,i,a){if(!t)return;!a&&i&&lo(t,n,s,i);let r=t;for(;t.prev!==t.next;){const l=t.prev,c=t.next;if(i?to(t,n,s,i):qe(t)){o.push(l.i,t.i,c.i),yt(t),t=c.next,r=c.next;continue}if(t=c,t===r){a?a===1?(t=eo(mt(t),o),vt(t,o,e,n,s,i,2)):a===2&&oo(t,o,e,n,s,i):vt(mt(t),o,e,n,s,i,1);break}}}function qe(t){const o=t.prev,e=t,n=t.next;if(B(o,e,n)>=0)return!1;const s=o.x,i=e.x,a=n.x,r=o.y,l=e.y,c=n.y,_=Math.min(s,i,a),f=Math.min(r,l,c),u=Math.max(s,i,a),E=Math.max(r,l,c);let h=n.next;for(;h!==o;){if(h.x>=_&&h.x<=u&&h.y>=f&&h.y<=E&&Ut(s,r,i,l,a,c,h.x,h.y)&&B(h.prev,h,h.next)>=0)return!1;h=h.next}return!0}function to(t,o,e,n){const s=t.prev,i=t,a=t.next;if(B(s,i,a)>=0)return!1;const r=s.x,l=i.x,c=a.x,_=s.y,f=i.y,u=a.y,E=Math.min(r,l,c),h=Math.min(_,f,u),g=Math.max(r,l,c),p=Math.max(_,f,u),x=ee(E,h,o,e,n),I=ee(g,p,o,e,n);let d=t.prevZ,T=t.nextZ;for(;d&&d.z>=x&&T&&T.z<=I;){if(d.x>=E&&d.x<=g&&d.y>=h&&d.y<=p&&d!==s&&d!==a&&Ut(r,_,l,f,c,u,d.x,d.y)&&B(d.prev,d,d.next)>=0||(d=d.prevZ,T.x>=E&&T.x<=g&&T.y>=h&&T.y<=p&&T!==s&&T!==a&&Ut(r,_,l,f,c,u,T.x,T.y)&&B(T.prev,T,T.next)>=0))return!1;T=T.nextZ}for(;d&&d.z>=x;){if(d.x>=E&&d.x<=g&&d.y>=h&&d.y<=p&&d!==s&&d!==a&&Ut(r,_,l,f,c,u,d.x,d.y)&&B(d.prev,d,d.next)>=0)return!1;d=d.prevZ}for(;T&&T.z<=I;){if(T.x>=E&&T.x<=g&&T.y>=h&&T.y<=p&&T!==s&&T!==a&&Ut(r,_,l,f,c,u,T.x,T.y)&&B(T.prev,T,T.next)>=0)return!1;T=T.nextZ}return!0}function eo(t,o){let e=t;do{const n=e.prev,s=e.next.next;!xt(n,s)&&Fe(n,e,e.next,s)&&wt(n,s)&&wt(s,n)&&(o.push(n.i,e.i,s.i),yt(e),yt(e.next),e=t=s),e=e.next}while(e!==t);return mt(e)}function oo(t,o,e,n,s,i){let a=t;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&uo(a,r)){let l=Ge(a,r);a=mt(a,a.next),l=mt(l,l.next),vt(a,o,e,n,s,i,0),vt(l,o,e,n,s,i,0);return}r=r.next}a=a.next}while(a!==t)}function no(t,o,e,n){const s=[];for(let i=0,a=o.length;i<a;i++){const r=o[i]*n,l=i<a-1?o[i+1]*n:t.length,c=Be(t,r,l,n,!1);c===c.next&&(c.steiner=!0),s.push(_o(c))}s.sort(so);for(let i=0;i<s.length;i++)e=io(s[i],e);return e}function so(t,o){let e=t.x-o.x;if(e===0&&(e=t.y-o.y,e===0)){const n=(t.next.y-t.y)/(t.next.x-t.x),s=(o.next.y-o.y)/(o.next.x-o.x);e=n-s}return e}function io(t,o){const e=ao(t,o);if(!e)return o;const n=Ge(e,t);return mt(n,n.next),mt(e,e.next)}function ao(t,o){let e=o;const n=t.x,s=t.y;let i=-1/0,a;if(xt(t,e))return e;do{if(xt(t,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){const f=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=n&&f>i&&(i=f,a=e.x<e.next.x?e:e.next,f===n))return a}e=e.next}while(e!==o);if(!a)return null;const r=a,l=a.x,c=a.y;let _=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Ce(s<c?n:i,s,l,c,s<c?i:n,s,e.x,e.y)){const f=Math.abs(s-e.y)/(n-e.x);wt(e,t)&&(f<_||f===_&&(e.x>a.x||e.x===a.x&&ro(a,e)))&&(a=e,_=f)}e=e.next}while(e!==r);return a}function ro(t,o){return B(t.prev,t,o.prev)<0&&B(o.next,t,t.next)<0}function lo(t,o,e,n){let s=t;do s.z===0&&(s.z=ee(s.x,s.y,o,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==t);s.prevZ.nextZ=null,s.prevZ=null,co(s)}function co(t){let o,e=1;do{let n=t,s;t=null;let i=null;for(o=0;n;){o++;let a=n,r=0;for(let c=0;c<e&&(r++,a=a.nextZ,!!a);c++);let l=e;for(;r>0||l>0&&a;)r!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,r--):(s=a,a=a.nextZ,l--),i?i.nextZ=s:t=s,s.prevZ=i,i=s;n=a}i.nextZ=null,e*=2}while(o>1);return t}function ee(t,o,e,n,s){return t=(t-e)*s|0,o=(o-n)*s|0,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,o=(o|o<<8)&16711935,o=(o|o<<4)&252645135,o=(o|o<<2)&858993459,o=(o|o<<1)&1431655765,t|o<<1}function _o(t){let o=t,e=t;do(o.x<e.x||o.x===e.x&&o.y<e.y)&&(e=o),o=o.next;while(o!==t);return e}function Ce(t,o,e,n,s,i,a,r){return(s-a)*(o-r)>=(t-a)*(i-r)&&(t-a)*(n-r)>=(e-a)*(o-r)&&(e-a)*(i-r)>=(s-a)*(n-r)}function Ut(t,o,e,n,s,i,a,r){return!(t===a&&o===r)&&Ce(t,o,e,n,s,i,a,r)}function uo(t,o){return t.next.i!==o.i&&t.prev.i!==o.i&&!fo(t,o)&&(wt(t,o)&&wt(o,t)&&ho(t,o)&&(B(t.prev,t,o.prev)||B(t,o.prev,o))||xt(t,o)&&B(t.prev,t,t.next)>0&&B(o.prev,o,o.next)>0)}function B(t,o,e){return(o.y-t.y)*(e.x-o.x)-(o.x-t.x)*(e.y-o.y)}function xt(t,o){return t.x===o.x&&t.y===o.y}function Fe(t,o,e,n){const s=zt(B(t,o,e)),i=zt(B(t,o,n)),a=zt(B(e,n,t)),r=zt(B(e,n,o));return!!(s!==i&&a!==r||s===0&&Ht(t,e,o)||i===0&&Ht(t,n,o)||a===0&&Ht(e,t,n)||r===0&&Ht(e,o,n))}function Ht(t,o,e){return o.x<=Math.max(t.x,e.x)&&o.x>=Math.min(t.x,e.x)&&o.y<=Math.max(t.y,e.y)&&o.y>=Math.min(t.y,e.y)}function zt(t){return t>0?1:t<0?-1:0}function fo(t,o){let e=t;do{if(e.i!==t.i&&e.next.i!==t.i&&e.i!==o.i&&e.next.i!==o.i&&Fe(e,e.next,t,o))return!0;e=e.next}while(e!==t);return!1}function wt(t,o){return B(t.prev,t,t.next)<0?B(t,o,t.next)>=0&&B(t,t.prev,o)>=0:B(t,o,t.prev)<0||B(t,t.next,o)<0}function ho(t,o){let e=t,n=!1;const s=(t.x+o.x)/2,i=(t.y+o.y)/2;do e.y>i!=e.next.y>i&&e.next.y!==e.y&&s<(e.next.x-e.x)*(i-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==t);return n}function Ge(t,o){const e=oe(t.i,t.x,t.y),n=oe(o.i,o.x,o.y),s=t.next,i=o.prev;return t.next=o,o.prev=t,e.next=s,s.prev=e,n.next=e,e.prev=n,i.next=n,n.prev=i,n}function be(t,o,e,n){const s=oe(t,o,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function yt(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ)}function oe(t,o,e){return{i:t,x:o,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function mo(t,o,e,n){let s=0;for(let i=o,a=e-n;i<e;i+=n)s+=(t[a]-t[i])*(t[i+1]+t[a+1]),a=i;return s}function Un(t,o){if(t.length===0)return{positions:[],heights:[],totalDistance:0};const e=Math.PI/180,n=6371e3,s=t[0][1],i=t[0][0],a=Math.cos(s*e),r=[];let l=0;for(let _=0;_<t.length;_++){const f=t[_][0],u=t[_][1],E=(f-i)*e*n*a,h=(u-s)*e*n;if(r.push([E,h]),_>0){const g=r[_][0]-r[_-1][0],p=r[_][1]-r[_-1][1];l+=Math.sqrt(g*g+p*p)}}let c;if(o&&o.length===t.length){const _=Math.min(...o);c=o.map(f=>f-_)}else c=new Array(t.length).fill(0);return{positions:r,heights:c,totalDistance:l}}function Yt(t,o,e){const n=Math.PI/180,s=6371e3,i=Math.cos(e[1]*n),a=(t-e[0])*n*s*i,r=(o-e[1])*n*s;return[a,r]}const Eo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAAF4AQMAAABHPlzBAAAABlBMVEVMcD00TiPJke3eAAADwUlEQVR4Ae3dIWzbShgH8P+d7dTJ63vNywIyaZusLiDaSEBBpEnTgWoyjKaCwsLCwoGBg4NVNVAYMFDOgTUOxlG4BsbRyDS1u3lnu/eve+v34/q3d7Ivd1+/a9CGAc0cNAvQzEAzxm8VoOFFqznvx1zxos+cEQRz4ozguiFhBD9kBmEs8SttwZLg1urGrXFrJS96wV1g+qdAk4Fm5wQsSQUWZf/0Nqh5mOgCrqsgT0jyHK51mCfsY/0S58jbrTJHLaJHqHUK16pFdIpaL/3RXb0GzZMoo6eIQQqaA9A8tWDZA80AbaSGE83fwPGj42djjNYb2rZQVcGXI1XcmBBtEE6F6zIbcDk1NQ/9nDT1/OpGPTEEzb+g2bnLD8mcF52CJjVg0RYSzbcEi9qAZguaCg2IAWjUGDQb0HwCzSlozlBrnxc9BU2Oh0wVUb47pv/o8xgnThvaxKrKF02bkJkBSyq7So5HoBmBZs/yT4/9R+9HWf/fhUMXtGhl4DPpuP1QFj4jgxZaRQ8srcK6E3/tRYgeKfB8AM06vmghhNBR1l6UibLgbdGLcZTRF6A5As0KNUredYQX9/M8W/BuV8x5T+X0ttFSis+jvO3zCjTP+FUhQMM1LIJEK6DVVZOL5k/I41mT8m7aZelON00KRJnv2dJw6UbR2tdVkBg4VNUkGr5odVwf7eWJ/gaabZTRG8SgiLK15Sto3t2XNqJ9XvQUNLP+owWL5m0LVUFrqNVV8N9/4HwGT4LP8c/o3b+3D0iUUTbEre7yQ9LwogvQ8PsJJJpKWbjkPobwWYImt2DJwIsuwJIYuP4PE23hGvGiUwimIXp7dya8I9eUF53z2oFz/qIz4Z1l/+NF+ybkM2jmsqvkuIyyEew9aFb86BCthXJbr0JD57zot7x7UgdxPuIRnFyEIJWm5R8yCCGEjfKvUusoty9FX1fyCXRJ+zFqTYvG1h1BKJU7AoYt7307QVx94JbX63POu52w5kUXEPJJHn6JM55FurvBG38xquO41KLFEjduN66rFtFT77g0rjlrEZ17K2GJqYv280SrY0Jp8MH1gUsfuPSB55Z2TslAix5Ik1ATKsrozND6vhMbvDSrzY0JSS2tge+fkKVlW/PQl6yp51c3RHfSBz7mFfNyYjSzn1Ki7ykhdkGjo/wXN6oEzZdeDu6HvOiFfE0KhzYxvjuwaKLkRa/BPxyklhad8f7GPSFEe/rAl5a2DxvKrjJal+hE+sAPKdE9fFF8amjR2tK2HwmvFykBjYIQgkrLlRle9Hc+iXVYizXG0gAAAABJRU5ErkJggg==",To="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABDCAMAAABAx6w2AAAABlBMVEXRpnG0iVwaKrObAAAAf0lEQVR42u3ZMQ6DQBAEQfr/n3ZEaOSTMAuiOiRiNb1zJ9hOpQ3YZWjGnjmls0LHGsyndXWaSnEVJxLGUm65uirKv3KsdAt+obKC3p3xN8w14gC4sIv69lzP44hcmxiPv1K2/pVjVXOaRRZI+RF0wz+9+Vw9nEQPWd/SKZgP/QOP+wBJ/lPHwgAAAABJRU5ErkJggg==",go="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAAF4AQMAAABHPlzBAAAABlBMVEVsm1lObzkN5n9tAAADwUlEQVR4Ae3dIWzbShgH8P+d7dTJ63vNywIyaZusLiDaSEBBpEnTgWoyjKaCwsLCwoGBg4NVNVAYMFDOgTUOxlG4BsbRyDS1u3lnu/eve+v34/q3d7Ivd1+/a9CGAc0cNAvQzEAzxm8VoOFFqznvx1zxos+cEQRz4ozguiFhBD9kBmEs8SttwZLg1urGrXFrJS96wV1g+qdAk4Fm5wQsSQUWZf/0Nqh5mOgCrqsgT0jyHK51mCfsY/0S58jbrTJHLaJHqHUK16pFdIpaL/3RXb0GzZMoo6eIQQqaA9A8tWDZA80AbaSGE83fwPGj42djjNYb2rZQVcGXI1XcmBBtEE6F6zIbcDk1NQ/9nDT1/OpGPTEEzb+g2bnLD8mcF52CJjVg0RYSzbcEi9qAZguaCg2IAWjUGDQb0HwCzSlozlBrnxc9BU2Oh0wVUb47pv/o8xgnThvaxKrKF02bkJkBSyq7So5HoBmBZs/yT4/9R+9HWf/fhUMXtGhl4DPpuP1QFj4jgxZaRQ8srcK6E3/tRYgeKfB8AM06vmghhNBR1l6UibLgbdGLcZTRF6A5As0KNUredYQX9/M8W/BuV8x5T+X0ttFSis+jvO3zCjTP+FUhQMM1LIJEK6DVVZOL5k/I41mT8m7aZelON00KRJnv2dJw6UbR2tdVkBg4VNUkGr5odVwf7eWJ/gaabZTRG8SgiLK15Sto3t2XNqJ9XvQUNLP+owWL5m0LVUFrqNVV8N9/4HwGT4LP8c/o3b+3D0iUUTbEre7yQ9LwogvQ8PsJJJpKWbjkPobwWYImt2DJwIsuwJIYuP4PE23hGvGiUwimIXp7dya8I9eUF53z2oFz/qIz4Z1l/+NF+ybkM2jmsqvkuIyyEew9aFb86BCthXJbr0JD57zot7x7UgdxPuIRnFyEIJWm5R8yCCGEjfKvUusoty9FX1fyCXRJ+zFqTYvG1h1BKJU7AoYt7307QVx94JbX63POu52w5kUXEPJJHn6JM55FurvBG38xquO41KLFEjduN66rFtFT77g0rjlrEZ17K2GJqYv280SrY0Jp8MH1gUsfuPSB55Z2TslAix5Ik1ATKsrozND6vhMbvDSrzY0JSS2tge+fkKVlW/PQl6yp51c3RHfSBz7mFfNyYjSzn1Ki7ykhdkGjo/wXN6oEzZdeDu6HvOiFfE0KhzYxvjuwaKLkRa/BPxyklhad8f7GPSFEe/rAl5a2DxvKrjJal+hE+sAPKdE9fFF8amjR2tK2HwmvFykBjYIQgkrLlRle9Hc+iXVYizXG0gAAAABJRU5ErkJggg==",po="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABDCAMAAABAx6w2AAAABlBMVEX/3Zjwt314xiaOAAAAf0lEQVR42u3ZMQ6DQBAEQfr/n3ZEaOSTMAuiOiRiNb1zJ9hOpQ3YZWjGnjmls0LHGsyndXWaSnEVJxLGUm65uirKv3KsdAt+obKC3p3xN8w14gC4sIv69lzP44hcmxiPv1K2/pVjVXOaRRZI+RF0wz+9+Vw9nEQPWd/SKZgP/QOP+wBJ/lPHwgAAAABJRU5ErkJggg==",xo=.6,Io=.3,Ao=.25,So=.2,Ro=.8,bo=-.5,Lo=-1,No=.5,Pn=.5,vn=.22,wn=.22,yn=.35,Bn=.1,Cn=.1,Fn=.16,Gn=.25,Oo=-.3,Do=-1,Mo=.6,Vn=.2,Hn=.2,zn=.32,Uo=.12,Po=.25,vo=.06,wo=.06,yo=.1,Bo=1.5,Co=200,Fo=Math.PI*.8,Go=.3,Vo=1,Ho=.95,zo=.85,ko=.1,Wo=300,Ko=Math.PI*.95,Zo=.1,Yo=.85,Jo=.82,Xo=.7,kn=3,Wn=80,Kn=Math.PI*.7,Zn=.3,Yn=1,Jn=.97,Xn=.85,jn=1.5,Qn=15,$n=Math.PI*.6,qn=1,ts=1,es=.12,os=.08,ns=5,ss=5e3,is=2.5,as=36,rs=12,ls=20,cs=10,_s=3,us=1.08,fs=.4,ds=30,hs=2.5,jo=4.5*2,ms=jo+2,Es=8,Ts=7,gs=.5,ps=2.6,xs=3,Is=2,As=5.5,Ss=.75,Rs=3.5,bs=.8,Ls=1.3,Ns=8,Os=.75,Ds=10,Ms=.5,Us=.35,Ps=2,vs=2,ws=2.5,ys=20,Bs=20,Cs=.03,Fs=.3,Gs=14,Vs=1,Hs=.04,zs=.25,ks=3,Ws=5,Ks=1.5,Zs=15,Ys=15,Js=je[1],Xs=we[0],js=we[1],Qs=100,$s=10,qs=250,ti=20,ei=2.4,oi=.35,ni=2.5,si=1.2,ii=.75,ai=100,ri=100,li=1200,ci=90,_i=15,ui=2,fi=8,di=1.5,hi=.75,mi=30,Ei=2,Ti=25,gi=.5,pi=30,xi=1,Ii=.4,Ai=3e3,Si=200,Ri=8,bi=10,Li=.5,Ni=.9,Oi=.01,Di=4,Mi=.62,Ui=.34,Pi=6,vi=.45,wi=2.5,yi=.12,Bi=2.5,Ci=1,Fi=12,Gi=1.8,Vi=2,Hi=.6,zi=4,ki=.5,Wi=4,Ki=.55,Zi=.4,Yi=8,Ji=-.01,Xi=1.5,ji=-.02,Qi=2,$i=3,qi=.03,ta=8192,ht=16,ea=500,oa=500,na=500,sa=500,ia=6,aa=10,ra=2,la=6,ca=20,_a=.5,ua=3.5,fa=2,da=3,Qo=50,$o=200,qo=1024,tn=2048,en=2048,Bt=250,bt=Bt*6,Lt=Bt*3,Le=Bt*.8,Ne=Bt*.3,on=`
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 shadowMatrix;

// Varyings
varying vec2 vUV;
varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionFromLight;

void main() {
  vUV = uv;
  vPositionW = (world * vec4(position, 1.0)).xyz;
  vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
  vPositionFromLight = shadowMatrix * vec4(vPositionW, 1.0);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`,nn=`
precision highp float;

// Varyings
varying vec2 vUV;
varying vec3 vNormalW;
varying vec3 vPositionW;
varying vec4 vPositionFromLight;

// Mask textures — three LOD levels: lo (full world), mid (inset), ultra (tight inset)
uniform sampler2D mixMap1Lo;
uniform sampler2D mixMap1Mid;
uniform sampler2D mixMap1Ultra;
uniform sampler2D mixMap2Lo;
uniform sampler2D mixMap2Mid;
uniform sampler2D mixMap2Ultra;
// Third mask: R=field zone, G=sand/beach candidate, B=encoded water Y
uniform sampler2D mixMap3Lo;
uniform sampler2D mixMap3Mid;
uniform sampler2D mixMap3Ultra;

// Inset bounds in UV space: vec4(uMin, vMin, uMax, vMax)
uniform vec4 midBounds;
uniform vec4 ultraBounds;

// Camera positions for distance-based LOD selection
uniform vec3 cameraPosition;
uniform vec3 cameraPosition2;
uniform float hasSecondCamera;  // 0.0 = single player, 1.0 = two areas of detail
uniform float lodNearDist;   // e.g. 50.0
uniform float lodFarDist;    // e.g. 200.0

// Diffuse textures (tiled)
uniform sampler2D forestTex;
uniform sampler2D dirtTex;
uniform sampler2D fieldTex;
uniform sampler2D sandTex;

// Solid-color values (replacing tiny 4×4 textures)
uniform vec3 roadColorVal;
uniform vec3 whiteColorVal;
uniform vec3 iceColorVal;
uniform vec3 concreteColorVal;

// Tiling factors
uniform float forestTiling;
uniform float dirtTiling;
uniform float fieldTiling;
uniform float sandTiling;
uniform float concreteTiling;

// Lighting
uniform vec3 sunDirection;
uniform float sunIntensity;
uniform float hemiIntensity;
uniform vec3 hemiGroundColor;

// Dynamic spot lights (floodlights, headlights, etc.)
#define MAX_SPOT_LIGHTS 12
uniform int numSpotLights;
uniform vec3 spotPositions[MAX_SPOT_LIGHTS];
uniform vec3 spotDirections[MAX_SPOT_LIGHTS];
uniform vec3 spotColors[MAX_SPOT_LIGHTS];
uniform float spotIntensities[MAX_SPOT_LIGHTS];
uniform float spotRanges[MAX_SPOT_LIGHTS];
uniform float spotCosAngles[MAX_SPOT_LIGHTS]; // cos(half-angle)
uniform float spotExponents[MAX_SPOT_LIGHTS];

// Shadow map
uniform sampler2D shadowMap;
uniform float hasShadowMap;
uniform int shadowLightIndex;

// Chunk debug grid
uniform float chunkDebug;   // 0.0 = off, 1.0 = on
uniform float chunkSizeUV;  // CHUNK_SIZE / groundSize in UV space

// Sample the best-available mix map using 3-level LOD:
//   ultra (tight inset, 2× quality)  → within lodNearDist from camera
//   mid   (wider inset, base quality) → lodNearDist – lodFarDist
//   lo    (full world, low quality)   → beyond lodFarDist
// When hasSecondCamera > 0, use the minimum distance from either camera
// so both players get high detail around them.
vec4 sampleMixMap(sampler2D lo, sampler2D mid, sampler2D ultra, vec2 uv) {
  vec2 dxz1 = vPositionW.xz - cameraPosition.xz;
  float dist = sqrt(dxz1.x * dxz1.x + dxz1.y * dxz1.y);
  if (hasSecondCamera > 0.5) {
    vec2 dxz2 = vPositionW.xz - cameraPosition2.xz;
    float dist2 = sqrt(dxz2.x * dxz2.x + dxz2.y * dxz2.y);
    dist = min(dist, dist2);
  }

  // --- Far LOD: only low-res available ---
  float farEdge = lodFarDist + 10.0;
  if (dist > farEdge) {
    return texture2D(lo, uv);
  }

  vec4 loSample = texture2D(lo, uv);

  // --- Mid LOD: blend lo → mid around lodFarDist ---
  bool inMid = uv.x >= midBounds.x && uv.x <= midBounds.z &&
               uv.y >= midBounds.y && uv.y <= midBounds.w;
  if (!inMid) return loSample;

  vec2 midUV = (uv - midBounds.xy) / (midBounds.zw - midBounds.xy);
  vec4 midSample = texture2D(mid, midUV);
  float midBlend = 1.0 - smoothstep(lodFarDist - 20.0, lodFarDist, dist);
  vec4 result = mix(loSample, midSample, midBlend);

  // --- Ultra LOD: blend mid → ultra around lodNearDist ---
  float nearEdge = lodNearDist + 5.0;
  if (dist > nearEdge) return result;

  bool inUltra = uv.x >= ultraBounds.x && uv.x <= ultraBounds.z &&
                 uv.y >= ultraBounds.y && uv.y <= ultraBounds.w;
  if (!inUltra) return result;

  vec2 hiUV = (uv - ultraBounds.xy) / (ultraBounds.zw - ultraBounds.xy);
  vec4 ultraSample = texture2D(ultra, hiUV);
  float ultraBlend = 1.0 - smoothstep(lodNearDist - 10.0, lodNearDist, dist);
  return mix(result, ultraSample, ultraBlend);
}

void main() {
  // Sample mix maps (3-level LOD based on distance from camera)
  vec4 mix1 = sampleMixMap(mixMap1Lo, mixMap1Mid, mixMap1Ultra, vUV);
  vec4 mix2 = sampleMixMap(mixMap2Lo, mixMap2Mid, mixMap2Ultra, vUV);
  vec4 mix3 = sampleMixMap(mixMap3Lo, mixMap3Mid, mixMap3Ultra, vUV);

  // Tiled texture coordinates
  vec2 forestUV = vUV * forestTiling;
  vec2 dirtUV = vUV * dirtTiling;
  vec2 fieldUV = vUV * fieldTiling;
  vec2 sandUV = vUV * sandTiling;
  vec2 concreteUV = vUV * concreteTiling;

  // Sample diffuse textures
  vec3 forestColor = texture2D(forestTex, forestUV).rgb;
  vec3 dirtColor = texture2D(dirtTex, dirtUV).rgb;
  vec3 roadColor = roadColorVal;
  vec3 whiteColor = whiteColorVal;
  vec3 iceColor = iceColorVal;
  vec3 fieldColor = texture2D(fieldTex, fieldUV).rgb;
  vec3 sandColor = texture2D(sandTex, sandUV).rgb;
  vec3 concreteColor = concreteColorVal;

  // Blending chain:
  //   1. Start with forest × R channel brightness
  vec3 color = forestColor * mix1.r;
  //   2. Blend field zone — soft-edged gradient baked into zoneMask R channel
  float fieldFactor = smoothstep(0.55, 1.0, mix3.r);
  color = mix(color, fieldColor, fieldFactor);
  //   2b. Blend concrete — soft-edged gradient baked into lineMask B channel
  float concreteFactor = smoothstep(0.55, 1.0, mix2.b);
  color = mix(color, concreteColor, concreteFactor);
  //   3. Blend sand/beach — smoothed candidate zone with height-based cutoff.
  //      Rendered before roads/paths so they draw on top of sand.
  //      mix3.G = sand candidate zone (soft-edged), mix3.B = encoded water Y.
  //      Decode water Y from B channel: [0,1] → [-100, +100] world units.
  //      Show sand where terrain Y is within 1m above the water surface,
  //      with a 0.5m soft transition.
  float sandCandidate = smoothstep(0.1, 0.8, mix3.g);
  if (sandCandidate > 0.001) {
    float waterY = mix3.b * 200.0 - 100.0;
    float sandTop = waterY + 1.0;
    float softness = 0.5;
    float sandFactor = sandCandidate * clamp((sandTop - vPositionW.y) / softness, 0.0, 1.0);
    color = mix(color, sandColor, sandFactor);
  }
  //   4. Blend road (G channel)
  color = mix(color, roadColor, mix1.g);
  //   5. Blend dirt/path (B channel) — on top of roads
  color = mix(color, dirtColor, mix1.b);
  //   6. Blend start line (mixMap2.R)
  color = mix(color, whiteColor, mix2.r);
  //   7. Blend ice patches (mixMap2.G)
  color = mix(color, iceColor, mix2.g);

  // Simple directional + hemispheric lighting (matches scene setup)
  vec3 nrm = normalize(vNormalW);
  float ndl = max(dot(nrm, -sunDirection), 0.0);
  float hemiBlend = nrm.y * 0.5 + 0.5; // 1 at top, 0 at bottom
  vec3 hemiColor = mix(hemiGroundColor, vec3(1.0), hemiBlend);
  vec3 lighting = hemiColor * hemiIntensity + vec3(1.0) * sunIntensity * ndl;

  // Accumulate dynamic spot light contributions
  for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {
    if (i >= numSpotLights) break;
    vec3 lightToFrag = vPositionW - spotPositions[i];
    float dist = length(lightToFrag);
    if (dist > spotRanges[i]) continue;

    vec3 lightDir = normalize(lightToFrag);
    // Cone test: dot of light direction and frag direction
    float cosAngle = dot(lightDir, normalize(spotDirections[i]));
    float outerCos = spotCosAngles[i];
    if (cosAngle < outerCos - 0.15) continue; // early-out with margin

    // Smooth cone edge: fade from 0 at outer boundary to 1 at inner edge
    float innerCos = mix(outerCos, 1.0, 0.2);
    float coneEdge = smoothstep(outerCos, innerCos, cosAngle);

    // Additional angular falloff from centre
    float coneFalloff = coneEdge * pow(cosAngle, spotExponents[i]);

    // Distance attenuation — smooth fade to zero at range
    float distNorm = dist / spotRanges[i];
    float distAtten = clamp(1.0 - distNorm * distNorm, 0.0, 1.0);
    distAtten *= distAtten; // squared for smoother falloff

    // Lambertian NdotL
    float spotNdl = max(dot(nrm, -lightDir), 0.0);

    // Shadow map test for the headlight
    float shadow = 1.0;
    if (hasShadowMap > 0.5 && i == shadowLightIndex) {
      vec3 shadowNDC = vPositionFromLight.xyz / vPositionFromLight.w;
      vec2 shadowUV = shadowNDC.xy * 0.5 + 0.5;
      float fragDepth = shadowNDC.z * 0.5 + 0.5;
      if (shadowUV.x > 0.0 && shadowUV.x < 1.0 && shadowUV.y > 0.0 && shadowUV.y < 1.0 && fragDepth > 0.0 && fragDepth < 1.0) {
        float storedDepth = texture2D(shadowMap, shadowUV).r;
        float bias = 0.002;
        shadow = (fragDepth - bias > storedDepth) ? 0.0 : 1.0;
      }
    }

    lighting += spotColors[i] * spotIntensities[i] * coneFalloff * distAtten * spotNdl * shadow;
  }

  gl_FragColor = vec4(color * lighting, 1.0);

  // Debug: chunk grid overlay
  if (chunkDebug > 0.5) {
    // Distance to nearest chunk grid line in UV space
    float gx = abs(fract(vUV.x / chunkSizeUV + 0.5) - 0.5) * chunkSizeUV;
    float gz = abs(fract(vUV.y / chunkSizeUV + 0.5) - 0.5) * chunkSizeUV;
    float lineThickness = 0.0005; // UV-space line width
    float gridDist = min(gx, gz);
    if (gridDist < lineThickness) {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    // Also outline the mid-res inset bounds in yellow
    float ib = 0.0008;
    float dLeft   = abs(vUV.x - midBounds.x);
    float dRight  = abs(vUV.x - midBounds.z);
    float dBottom = abs(vUV.y - midBounds.y);
    float dTop    = abs(vUV.y - midBounds.w);
    bool inVertRange = vUV.y >= midBounds.y - ib && vUV.y <= midBounds.w + ib;
    bool inHorizRange = vUV.x >= midBounds.x - ib && vUV.x <= midBounds.z + ib;
    if ((dLeft < ib && inVertRange) || (dRight < ib && inVertRange) ||
        (dBottom < ib && inHorizRange) || (dTop < ib && inHorizRange)) {
      gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
    // Outline ultra-res inset bounds in cyan
    float dLeftU   = abs(vUV.x - ultraBounds.x);
    float dRightU  = abs(vUV.x - ultraBounds.z);
    float dBottomU = abs(vUV.y - ultraBounds.y);
    float dTopU    = abs(vUV.y - ultraBounds.w);
    bool inVertRangeU = vUV.y >= ultraBounds.y - ib && vUV.y <= ultraBounds.w + ib;
    bool inHorizRangeU = vUV.x >= ultraBounds.x - ib && vUV.x <= ultraBounds.z + ib;
    if ((dLeftU < ib && inVertRangeU) || (dRightU < ib && inVertRangeU) ||
        (dBottomU < ib && inHorizRangeU) || (dTopU < ib && inHorizRangeU)) {
      gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
    }
  }
}
`;function ha(t,o){const{pathPositions:e,roads:n=[],trails:s=[],groundSize:i=6e3,pathHalfWidth:a=5,roadHalfWidth:r=a*1.4,edgeSoftness:l=1.5,maskResolution:c=4096,forestTiling:_=600,dirtTiling:f=300,fieldTiling:u=600,sandTiling:E=600,concreteTiling:h=400,startLine:g,startCircle:p,pathTextureUrl:x,fields:I=[],concrete:d=[],regions:T=[],waterZones:F=[]}=o,G=[...I.map(N=>({type:"field",points:N,zIndex:0})),...d.map(N=>({type:"concrete",points:N,zIndex:0})),...T];G.sort((N,A)=>N.zIndex-A.zIndex);const K=t.getEngine().getCaps().maxTextureSize||4096,Z=Math.min(qo,K),Y=Math.min(tn,K),rt=Math.min(en,K),it=jt(t,"lo",Z,e,n,s,i,a,r,l,g,p,-i/2,-i/2,i,i,G,F),Q=e.length>0?e[0][0]:0,$=e.length>0?e[0][1]:0,H=bt/2,J=Lt/2,X=jt(t,"mid",Y,e,n,s,i,a,r,l,g,p,Q-H,$-H,bt,bt,G,F),k=jt(t,"ultra",rt,e,n,s,i,a,r,l,g,p,Q-J,$-J,Lt,Lt,G,F);let lt=Q,It=$,Ct=Q,At=$;const ut=i/2,Et=(N,A,V)=>{const w=(N-V+ut)/i,ct=(A-V+ut)/i,C=(N+V+ut)/i,Rt=(A+V+ut)/i;return[w,ct,C,Rt]};let tt=Et(Q,$,H),et=Et(Q,$,J);const S="tiledPathGround";Se.ShadersStore[S+"VertexShader"]=on,Se.ShadersStore[S+"FragmentShader"]=nn;const R=new Vt(Eo,t);R.anisotropicFilteringLevel=ht;const O=new Vt(x??To,t);O.anisotropicFilteringLevel=ht;const L=new Vt(go,t);L.anisotropicFilteringLevel=ht;const b=new Vt(po,t);b.anisotropicFilteringLevel=ht;const m=new Qe(S,t,S,{attributes:["position","normal","uv"],uniforms:["worldViewProjection","world","midBounds","ultraBounds","cameraPosition","cameraPosition2","hasSecondCamera","lodNearDist","lodFarDist","forestTiling","dirtTiling","fieldTiling","sandTiling","concreteTiling","roadColorVal","whiteColorVal","iceColorVal","concreteColorVal","sunDirection","sunIntensity","hemiIntensity","hemiGroundColor","chunkDebug","chunkSizeUV","numSpotLights","spotPositions","spotDirections","spotColors","spotIntensities","spotRanges","spotCosAngles","spotExponents","shadowMatrix","hasShadowMap","shadowLightIndex"],samplers:["mixMap1Lo","mixMap1Mid","mixMap1Ultra","mixMap2Lo","mixMap2Mid","mixMap2Ultra","mixMap3Lo","mixMap3Mid","mixMap3Ultra","forestTex","dirtTex","fieldTex","sandTex","shadowMap"]});m.backFaceCulling=!0,m.setTexture("mixMap1Lo",it.maskTex),m.setTexture("mixMap1Mid",X.maskTex),m.setTexture("mixMap1Ultra",k.maskTex),m.setTexture("mixMap2Lo",it.lineMaskTex),m.setTexture("mixMap2Mid",X.lineMaskTex),m.setTexture("mixMap2Ultra",k.lineMaskTex),m.setTexture("mixMap3Lo",it.zoneMaskTex),m.setTexture("mixMap3Mid",X.zoneMaskTex),m.setTexture("mixMap3Ultra",k.zoneMaskTex),m.setTexture("forestTex",R),m.setTexture("dirtTex",O),m.setTexture("fieldTex",L),m.setTexture("sandTex",b),m.setVector3("roadColorVal",kt("#606066")),m.setVector3("whiteColorVal",kt("#ffffff")),m.setVector3("iceColorVal",kt("#85d2ff")),m.setVector3("concreteColorVal",kt("#909090")),m.setFloat("forestTiling",_),m.setFloat("dirtTiling",f),m.setFloat("fieldTiling",u),m.setFloat("sandTiling",E),m.setFloat("concreteTiling",h);const D=(N,A,V,w)=>({x:N,y:A,z:V,w});m.setVector4("midBounds",D(tt[0],tt[1],tt[2],tt[3])),m.setVector4("ultraBounds",D(et[0],et[1],et[2],et[3])),m.setFloat("lodNearDist",Qo),m.setFloat("lodFarDist",$o),m.setVector3("cameraPosition",{x:0,y:0,z:0}),m.setVector3("cameraPosition2",{x:0,y:0,z:0}),m.setFloat("hasSecondCamera",0);const v=o.isNight??!1,M=v?new U(Oo,Do,Mo):new U(bo,Lo,No),z=Math.sqrt(M.r*M.r+M.g*M.g+M.b*M.b);m.setVector3("sunDirection",{x:M.r/z,y:M.g/z,z:M.b/z}),m.setFloat("sunIntensity",v?Uo:Ro),m.setFloat("hemiIntensity",v?Po:xo),m.setVector3("hemiGroundColor",v?{x:vo,y:wo,z:yo}:{x:Io,y:Ao,z:So}),m.setFloat("chunkDebug",0),m.setFloat("chunkSizeUV",Bt/i),m.setFloat("hasShadowMap",0),m.setInt("shadowLightIndex",-1),m.setMatrix("shadowMatrix",Re.Identity());const y=12,W=new Float32Array(y*3),nt=new Float32Array(y*3),Ft=new Float32Array(y*3),St=new at,_e=new Float32Array(y),ue=new Float32Array(y),fe=new Float32Array(y),de=new Float32Array(y);m.setInt("numSpotLights",0);let Jt=null,Gt=null,he=null;const me=new Re;m.onBind=()=>{const N=t.lights;let A=0,V=-1;for(let ct=0;ct<N.length&&A<y;ct++){const C=N[ct];if(!(C instanceof te)||!C.isEnabled())continue;C===he&&(V=A);const Rt=C.getAbsolutePosition(),q=A*3;W[q]=Rt.x,W[q+1]=Rt.y,W[q+2]=Rt.z,C.parent?(at.TransformNormalToRef(C.direction,C.parent.getWorldMatrix(),St),St.normalize(),nt[q]=St.x,nt[q+1]=St.y,nt[q+2]=St.z):(nt[q]=C.direction.x,nt[q+1]=C.direction.y,nt[q+2]=C.direction.z),Ft[q]=C.diffuse.r,Ft[q+1]=C.diffuse.g,Ft[q+2]=C.diffuse.b,_e[A]=C.intensity,ue[A]=C.range,fe[A]=Math.cos(C.angle*.5),de[A]=C.exponent,A++}const w=m.getEffect();w&&(w.setInt("numSpotLights",A),A>0&&(w.setArray3("spotPositions",Array.from(W.subarray(0,A*3))),w.setArray3("spotDirections",Array.from(nt.subarray(0,A*3))),w.setArray3("spotColors",Array.from(Ft.subarray(0,A*3))),w.setFloatArray("spotIntensities",_e.subarray(0,A)),w.setFloatArray("spotRanges",ue.subarray(0,A)),w.setFloatArray("spotCosAngles",fe.subarray(0,A)),w.setFloatArray("spotExponents",de.subarray(0,A))),w.setFloat3("cameraPosition",Ee,Te,ge),w.setFloat3("cameraPosition2",pe,xe,Ie),w.setFloat("hasSecondCamera",Ae),Jt&&Gt&&V>=0?(Gt.getViewMatrix().multiplyToRef(Gt.getProjectionMatrix(),me),w.setMatrix("shadowMatrix",me),w.setFloat("hasShadowMap",1),w.setInt("shadowLightIndex",V),w.setTexture("shadowMap",Jt)):w.setFloat("hasShadowMap",0))};let Ee=0,Te=0,ge=0;const Ze=(N,A,V)=>{Ee=N,Te=A,ge=V};let pe=0,xe=0,Ie=0,Ae=0;const Ye=(N,A,V)=>{pe=N,xe=A,Ie=V,Ae=1},Je=N=>{it.setIcePatches(N),X.setIcePatches(N),k.setIcePatches(N)},Xe=(N,A)=>{const V=N-lt,w=A-It;V*V+w*w>=Le*Le&&(lt=N,It=A,Oe(X,Y,e,n,s,i,a,r,l,g,p,N-H,A-H,bt,bt,G,F),tt=Et(N,A,H),m.setVector4("midBounds",{x:tt[0],y:tt[1],z:tt[2],w:tt[3]}));const ct=N-Ct,C=A-At;ct*ct+C*C>=Ne*Ne&&(Ct=N,At=A,Oe(k,rt,e,n,s,i,a,r,l,g,p,N-J,A-J,Lt,Lt,G,F),et=Et(N,A,J),m.setVector4("ultraBounds",{x:et[0],y:et[1],z:et[2],w:et[3]}))};return m.__setIcePatches=Je,m.__updateInsetCenter=Xe,m.__setViewCenter=Ze,m.__setViewCenter2=Ye,m.__setShadowMap=(N,A,V)=>{Jt=N,Gt=A,he=V},m}function jt(t,o,e,n,s,i,a,r,l,c,_,f,u,E,h,g,p=[],x=[]){const I=e,d=new Xt(`pathMask_${o}`,I,t,!1),T=d.getContext(),F=new Xt(`lineMask_${o}`,I,t,!1),G=F.getContext(),K=new Xt(`zoneMask_${o}`,I,t,!1),Z=K.getContext();d.anisotropicFilteringLevel=ht,F.anisotropicFilteringLevel=ht,K.anisotropicFilteringLevel=ht,He(T,G,Z,I,n,s,i,a,r,l,c,_,f,u,E,h,g,p,x);const Y=document.createElement("canvas");return Y.width=I,Y.height=I,Y.getContext("2d").drawImage(G.canvas,0,0),d.update(),F.update(),K.update(),{maskTex:d,lineMaskTex:F,zoneMaskTex:K,staticLineCanvas:Y,setIcePatches:Q=>{G.clearRect(0,0,I,I),G.drawImage(Y,0,0);const $=Ve(u,E,h,g,I);for(const H of Q){if(H.alpha<=0||H.radius<=0)continue;const[J,X]=$(H.x,H.z),k=H.radius/h*I;if(J+k<0||J-k>I||X+k<0||X-k>I)continue;const lt=Math.max(0,Math.min(255,Math.round(H.alpha*255)));G.fillStyle=`rgb(0, ${lt}, 0)`,G.beginPath(),G.arc(J,X,k,0,Math.PI*2),G.fill()}F.update()},worldMinX:u,worldMinZ:E,worldW:h,worldH:g}}function Oe(t,o,e,n,s,i,a,r,l,c,_,f,u,E,h,g=[],p=[]){const x=o,I=t.maskTex.getContext(),d=t.lineMaskTex.getContext(),T=t.zoneMaskTex.getContext();He(I,d,T,x,e,n,s,i,a,r,l,c,_,f,u,E,h,g,p);const F=t.staticLineCanvas.getContext("2d");F.clearRect(0,0,x,x),F.drawImage(d.canvas,0,0),t.maskTex.update(),t.lineMaskTex.update(),t.zoneMaskTex.update(),t.worldMinX=f,t.worldMinZ=u,t.worldW=E,t.worldH=h}function Ve(t,o,e,n,s){return(i,a)=>{const r=(i-t)/e*s,l=(o+n-a)/n*s;return[r,l]}}const De=10,Me=.35;function sn(t,o,e){if(o.length<2)return;if(o.length===2){const[l,c]=e(o[0][0],o[0][1]),[_,f]=e(o[1][0],o[1][1]);t.moveTo(l,c),t.lineTo(_,f);return}const n=[];for(let l=0;l<o.length-1;l++){const c=o[l+1][0]-o[l][0],_=o[l+1][1]-o[l][1];n.push(Math.sqrt(c*c+_*_))}const[s,i]=e(o[0][0],o[0][1]);t.moveTo(s,i);for(let l=1;l<o.length-1;l++){const c=n[l-1],_=n[l],f=Math.min(De,c*Me),u=Math.min(De,_*Me),[E,h]=o[l],[g,p]=o[l-1],[x,I]=o[l+1],d=E-g,T=h-p,F=c>0?1-f/c:1,G=g+d*F,K=p+T*F,Z=x-E,Y=I-h,rt=_>0?u/_:0,it=E+Z*rt,Q=h+Y*rt,[$,H]=e(G,K);t.lineTo($,H);const[J,X]=e(E,h),[k,lt]=e(it,Q);t.quadraticCurveTo(J,X,k,lt)}const[a,r]=e(o[o.length-1][0],o[o.length-1][1]);t.lineTo(a,r)}function He(t,o,e,n,s,i,a,r,l,c,_,f,u,E,h,g,p,x=[],I=[]){const d=Ve(E,h,g,p,n);t.fillStyle="rgb(255, 0, 0)",t.fillRect(0,0,n,n),o.fillStyle="rgb(0, 0, 0)",o.fillRect(0,0,n,n),e.fillStyle="rgb(0, 0, 0)",e.fillRect(0,0,n,n);const T=S=>S/g*n,F=6,G=10,K=[...x].sort((S,R)=>S.zIndex-R.zIndex);for(const S of K){const R=S.points;if(!(R.length<3))if(S.type==="concrete"){const O=T(F);e.globalCompositeOperation="source-over",e.beginPath();for(let b=0;b<R.length;b++){const[m,D]=d(R[b][0],R[b][1]);b===0?e.moveTo(m,D):e.lineTo(m,D)}e.closePath(),e.fillStyle="rgb(0, 0, 0)",e.fill(),o.globalCompositeOperation="lighten";const L=(b,m)=>{o.beginPath();for(let D=0;D<R.length;D++){const[v,M]=d(R[D][0],R[D][1]);D===0?o.moveTo(v,M):o.lineTo(v,M)}o.closePath(),m!==void 0?(o.lineWidth=m,o.lineJoin="round",o.strokeStyle=b,o.stroke()):(o.fillStyle=b,o.fill())};L("rgb(0, 0, 160)",O*2),L("rgb(0, 0, 200)",O*1.2),L("rgb(0, 0, 235)",O*.5),L("rgb(0, 0, 255)"),o.globalCompositeOperation="source-over"}else{const O=T(G);o.globalCompositeOperation="source-over",o.beginPath();for(let b=0;b<R.length;b++){const[m,D]=d(R[b][0],R[b][1]);b===0?o.moveTo(m,D):o.lineTo(m,D)}o.closePath(),o.fillStyle="rgb(0, 0, 0)",o.fill(),e.globalCompositeOperation="lighten";const L=(b,m)=>{e.beginPath();for(let D=0;D<R.length;D++){const[v,M]=d(R[D][0],R[D][1]);D===0?e.moveTo(v,M):e.lineTo(v,M)}e.closePath(),m!==void 0?(e.lineWidth=m,e.lineJoin="round",e.strokeStyle=b,e.stroke()):(e.fillStyle=b,e.fill())};L("rgb(160, 0, 0)",O*2),L("rgb(200, 0, 0)",O*1.2),L("rgb(235, 0, 0)",O*.5),L("rgb(255, 0, 0)"),e.globalCompositeOperation="source-over"}}if(I.length>0){const O=T(20),L=T(8);e.globalCompositeOperation="lighten";for(const b of I){if(b.points.length<3)continue;const m=Math.max(0,Math.min(255,Math.round((b.y+100)/200*255))),D=(v,M)=>{const z=`rgb(0, ${M}, ${m})`;e.lineWidth=v,e.lineJoin="round",e.strokeStyle=z,e.beginPath();for(let y=0;y<b.points.length;y++){const[W,nt]=d(b.points[y][0],b.points[y][1]);y===0?e.moveTo(W,nt):e.lineTo(W,nt)}e.closePath(),e.stroke()};D(O*2+L*2,100),D(O*2+L,180),D(O*2,255),e.fillStyle=`rgb(0, 255, ${m})`,e.beginPath();for(let v=0;v<b.points.length;v++){const[M,z]=d(b.points[v][0],b.points[v][1]);v===0?e.moveTo(M,z):e.lineTo(M,z)}e.closePath(),e.fill()}e.globalCompositeOperation="source-over"}if(s.length<2)return;const Z=(S,R,O,L=t)=>{S.length<2||(L.lineWidth=R,L.lineCap="round",L.lineJoin="round",L.strokeStyle=O,L.beginPath(),sn(L,S,d),L.stroke())},Y=(S,R,O,L)=>{t.lineWidth=O,t.lineCap="round",t.lineJoin="round",t.strokeStyle=L,t.beginPath(),t.moveTo(S[0],S[1]),t.lineTo(R[0],R[1]),t.stroke()},rt=c*2+_*1.2,it=T(rt),Q=c*2+_*.4,$=T(Q),H=c*2,J=T(H);t.globalCompositeOperation="lighten";for(const S of i)Z(S,it,"rgb(255, 140, 0)"),Z(S,$,"rgb(255, 210, 0)"),Z(S,J,"rgb(255, 255, 0)");t.globalCompositeOperation="source-over";const X=(l+_)*2,k=T(X);Z(s,k,"rgb(255, 0, 115)");const lt=(l+_*.4)*2,It=T(lt);Z(s,It,"rgb(255, 0, 179)");const Ct=l*2,At=T(Ct);Z(s,At,"rgb(255, 0, 255)");const ut=l*.4,Et=(ut+_*.4)*2,tt=T(Et),et=T(ut*2);t.globalCompositeOperation="lighten";for(const S of a)Z(S,tt,"rgb(255, 0, 60)"),Z(S,et,"rgb(255, 0, 110)");if(t.globalCompositeOperation="source-over",u&&s.length>0){const S=s[0][0]-u.x,R=s[0][1]-u.z,O=Math.sqrt(S*S+R*R);if(O>.001){const L=S/O,b=R/O,m=d(s[0][0],s[0][1]),D=d(u.x+L*Math.max(0,u.radius-(l+_)),u.z+b*Math.max(0,u.radius-(l+_))),v=d(u.x+L*Math.max(0,u.radius-(l+_*.4)),u.z+b*Math.max(0,u.radius-(l+_*.4))),M=d(u.x+L*Math.max(0,u.radius-l),u.z+b*Math.max(0,u.radius-l));t.globalCompositeOperation="lighten",Y(D,m,k,"rgb(255, 0, 115)"),Y(v,m,It,"rgb(255, 0, 179)"),Y(M,m,At,"rgb(255, 0, 255)"),t.globalCompositeOperation="source-over"}}if(u){const[S,R]=d(u.x,u.z),O=T(u.radius);t.globalCompositeOperation="lighten";const L=O+T(_);t.beginPath(),t.arc(S,R,L,0,Math.PI*2),t.fillStyle="rgb(255, 0, 115)",t.fill();const b=O+T(_*.4);t.beginPath(),t.arc(S,R,b,0,Math.PI*2),t.fillStyle="rgb(255, 0, 179)",t.fill(),t.beginPath(),t.arc(S,R,O,0,Math.PI*2),t.fillStyle="rgb(255, 0, 255)",t.fill(),t.globalCompositeOperation="source-over"}if(f){const{x:S,z:R,yaw:O,width:L,thickness:b=.4}=f,m=Math.cos(O),D=-Math.sin(O),v=Math.sin(O),M=Math.cos(O),z=L/2,y=b/2,W=[d(S-m*z-v*y,R-D*z-M*y),d(S+m*z-v*y,R+D*z-M*y),d(S+m*z+v*y,R+D*z+M*y),d(S-m*z+v*y,R-D*z+M*y)];o.fillStyle="rgb(255, 0, 0)",o.beginPath(),o.moveTo(W[0][0],W[0][1]),o.lineTo(W[1][0],W[1][1]),o.lineTo(W[2][0],W[2][1]),o.lineTo(W[3][0],W[3][1]),o.closePath(),o.fill()}}function kt(t){const o=parseInt(t.slice(1,3),16)/255,e=parseInt(t.slice(3,5),16)/255,n=parseInt(t.slice(5,7),16)/255;return{x:o,y:e,z:n}}function ze(t,o){const e=new st(o,t);return e.diffuseColor=new U(.1,.4,.75),e.specularColor=new U(.4,.4,.5),e.alpha=.85,e}function an(t,o,e,n=.02){if(e.length<3)return null;const s=e.map(([i,a])=>new at(i,0,a));try{const i=P.CreatePolygon(o,{shape:s,sideOrientation:ye.DOUBLESIDE},t,$e);return i.position.y=n,i.material=ze(t,`${o}_mat`),i}catch(i){return console.warn(`[water] Failed to create polygon ${o}:`,i),null}}function rn(t,o,e,n,s=.02){if(e.length<2)return null;const i=[],a=[],r=n/2;for(let l=0;l<e.length;l++){const[c,_]=e[l];let f,u;l===0?(f=e[1][0]-c,u=e[1][1]-_):l===e.length-1?(f=c-e[l-1][0],u=_-e[l-1][1]):(f=e[l+1][0]-e[l-1][0],u=e[l+1][1]-e[l-1][1]);const E=Math.sqrt(f*f+u*u)||1,h=-u/E,g=f/E;i.push(new at(c+h*r,s,_+g*r)),a.push(new at(c-h*r,s,_-g*r))}try{const l=P.CreateRibbon(o,{pathArray:[i,a],sideOrientation:ye.DOUBLESIDE},t);return l.material=ze(t,`${o}_mat`),l}catch(l){return console.warn(`[water] Failed to create ribbon ${o}:`,l),null}}function ma(t){return()=>{t|=0,t=t+1831565813|0;let o=Math.imul(t^t>>>15,1|t);return o=o+Math.imul(o^o>>>7,61|o)^o,((o^o>>>14)>>>0)/4294967296}}function ln(t,o,e,n,s){const i=s*s,a=i*s;return .5*(2*o+(-t+e)*s+(2*t-5*o+4*e-n)*i+(-t+3*o-3*e+n)*a)}function Ea(t,o,e,n){if(t.length===0)return[];const s=Math.min(...t.map(i=>i[2]));return t.map(([i,a,r])=>{const[l,c]=Yt(a,i,o);return{x:l*e,z:c*e,h:(r-s)*n}})}function Ta(t,o,e,n=12){const s=e.length;if(s===0)return 0;if(s===1)return e[0].h;const i=[];for(let c=0;c<s;c++){const _=t-e[c].x,f=o-e[c].z,u=_*_+f*f;i.push({dist2:u,h:e[c].h})}if(i.sort((c,_)=>c.dist2-_.dist2),i[0].dist2<.001)return i[0].h;const a=Math.min(n,s);let r=0,l=0;for(let c=0;c<a;c++){const _=1/i[c].dist2;r+=_,l+=_*i[c].h}return l/r}function ga(t,o,e,n){const s=e.length;if(s===0)return 0;if(s===1)return n[0]??0;let i=1/0,a=0,r=0;for(let u=0;u<s-1;u++){const[E,h]=e[u],[g,p]=e[u+1],x=g-E,I=p-h,d=x*x+I*I;let T=d>0?((t-E)*x+(o-h)*I)/d:0;T=Math.max(0,Math.min(1,T));const F=E+T*x,G=h+T*I,K=(t-F)**2+(o-G)**2;K<i&&(i=K,a=u,r=T)}const l=Math.max(0,a-1),c=a,_=Math.min(s-1,a+1),f=Math.min(s-1,a+2);return ln(n[l],n[c],n[_],n[f],r)}function le(t,o,e){let n=!1;for(let s=0,i=e.length-1;s<e.length;i=s++){const[a,r]=e[s],[l,c]=e[i];r>o!=c>o&&t<(l-a)*(o-r)/(c-r)+a&&(n=!n)}return n}function cn(t,o,e){let n=1/0;for(let s=0,i=e.length-1;s<e.length;i=s++){const[a,r]=e[i],[l,c]=e[s],_=l-a,f=c-r,u=_*_+f*f;let E=u>0?((t-a)*_+(o-r)*f)/u:0;E=Math.max(0,Math.min(1,E));const h=Math.sqrt((t-(a+E*_))**2+(o-(r+E*f))**2);h<n&&(n=h)}return n}function pa(t,o,e){let n=1/0;for(let s=0;s<e.length-1;s++){const[i,a]=e[s],[r,l]=e[s+1],c=r-i,_=l-a,f=c*c+_*_;let u=f>0?((t-i)*c+(o-a)*_)/f:0;u=Math.max(0,Math.min(1,u));const E=i+u*c,h=a+u*_,g=Math.sqrt((t-E)**2+(o-h)**2);g<n&&(n=g)}return n}function xa(t,o,e){for(const n of e)if(le(t,o,n.points))return!0;return!1}function Ia(t,o,e){for(const n of e)if(le(t,o,n.points))return n.y;return null}function Aa(t,o,e,n){for(const i of e){let a=1/0,r=-1/0,l=1/0,c=-1/0;for(const[E,h]of i.points)E<a&&(a=E),E>r&&(r=E),h<l&&(l=h),h>c&&(c=h);if(t<a-15||t>r+15||o<l-15||o>c+15)continue;const _=le(t,o,i.points),f=i.y-2;if(_)return f;const u=cn(t,o,i.points);if(u<15){const E=n(t,o)-.08,h=u/15;return E*h+f*(1-h)}}return null}function Sa(t,o,e,n){const s=[];console.log(`[water] Processing ${t.length} water features`);for(const i of t){const a=i.coords.map(([l,c])=>{const[_,f]=Yt(l,c,o);return[_*e,f*e]});let r=1/0;for(const[l,c]of a){const _=n(l,c);_<r&&(r=_)}isFinite(r)||(r=0),s.push({points:a,y:r+.1})}return console.log(`[water] ${s.length} water zones stored`),s}function Ra(t,o){for(let e=0;e<o.length;e++){const n=o[e];n.points.length>=3?an(t,`water_${e}`,n.points,n.y):n.points.length>=2&&rn(t,`water_${e}`,n.points,20,n.y)}}function ba(t,o,e){const n=[];for(const s of t){if(s.length<2)continue;const i=s.map(([a,r])=>{const[l,c]=Yt(r,a,o);return[l*e,c*e]});i.length>=2&&n.push(i)}return n}function La(t,o,e){const n=[];for(const s of t){if(s.points.length<3)continue;const i=s.points.map(([a,r])=>{const[l,c]=Yt(r,a,o);return[l*e,c*e]});i.length>=3&&n.push({type:s.type,height:s.height,points:i})}return n}const ne=25,_n=.4,un=.18,Wt=.5,Ue=1.4,Pe=2,se=.8,ve=1.2,fn=1.2,dn=.1;function hn(t){const o=new st("flSteelMat",t);o.diffuseColor=new U(.5,.52,.55),o.specularColor=new U(.15,.15,.15);const e=new st("flDarkMat",t);e.diffuseColor=new U(.12,.12,.14),e.specularColor=new U(.08,.08,.08);const n=new st("flLensMat",t);n.diffuseColor=new U(1,.98,.9),n.emissiveColor=new U(.8,.75,.55),n.specularColor=new U(.3,.3,.2),n.alpha=.9;const s=P.CreateCylinder("tpl_fl_base",{height:Wt,diameterTop:Ue*.85,diameterBottom:Ue,tessellation:8},t);s.material=o,s.isVisible=!1;const i=P.CreateCylinder("tpl_fl_mast",{height:ne,diameterTop:un,diameterBottom:_n,tessellation:8},t);i.material=o,i.isVisible=!1;const a=P.CreateCylinder("tpl_fl_bracket",{height:fn,diameter:dn,tessellation:6},t);a.material=o,a.isVisible=!1;const r=P.CreateBox("tpl_fl_housing",{width:Pe,height:se,depth:ve},t);r.material=e,r.isVisible=!1;const l=P.CreateBox("tpl_fl_lens",{width:Pe*.85,height:.08,depth:ve*.8},t);return l.material=n,l.isVisible=!1,{base:s,mast:i,bracket:a,housing:r,lens:l}}function mn(t,o,e,n,s,i,a,r){const l=new Zt(`floodlight_${e}`,o);l.position.set(n,s,i),l.rotation.y=a;const c=t.base.createInstance(`fl_${e}_base`);c.position.y=Wt/2,c.parent=l;const _=t.mast.createInstance(`fl_${e}_mast`);_.position.y=Wt+ne/2,_.parent=l;const f=Wt+ne,u=t.bracket.createInstance(`fl_${e}_bracket`);u.position.set(0,f-.1,0),u.rotation.x=.3,u.parent=l;const E=f+se*.5+.1,h=t.housing.createInstance(`fl_${e}_housing`);h.position.set(0,E,0),h.parent=l;const g=t.lens.createInstance(`fl_${e}_lens`);g.position.set(0,E-se*.5-.04,0),g.parent=l;let p=null;if(r){const x=E-.1,I=new te(`fl_${e}_primary`,new at(0,x,0),new at(0,-1,.1),Fo,Go,o);I.diffuse=new U(Vo,Ho,zo),I.intensity=Bo,I.range=Co,I.parent=l,p=I;const d=new te(`fl_${e}_soft`,new at(0,x,0),new at(0,-1,.05),Ko,Zo,o);d.diffuse=new U(Yo,Jo,Xo),d.intensity=ko,d.range=Wo,d.parent=l}return{root:l,primaryLight:p}}let Nt=null,Ot=null,Dt=null,Tt=null,Mt=null,ft=null;function En(t){return Nt||(Nt=new st("objWood",t),Nt.diffuseColor=new U(.48,.32,.18),Nt.specularColor=new U(.06,.04,.02)),Nt}function ce(t){return Ot||(Ot=new st("objIron",t),Ot.diffuseColor=new U(.18,.18,.2),Ot.specularColor=new U(.1,.1,.12)),Ot}function Tn(t){return Dt||(Dt=new st("objWhite",t),Dt.diffuseColor=new U(.92,.92,.92),Dt.specularColor=new U(.1,.1,.1)),Dt}function gn(t){return Tt||(Tt=new st("objNet",t),Tt.diffuseColor=new U(.85,.85,.85),Tt.specularColor=U.Black(),Tt.alpha=.6),Tt}function pn(t){return Mt||(Mt=new st("objCourt",t),Mt.diffuseColor=new U(.22,.42,.22),Mt.specularColor=U.Black()),Mt}function xn(t){return ft||(ft=new st("objGlass",t),ft.diffuseColor=new U(.85,.82,.6),ft.emissiveColor=new U(.35,.32,.15),ft.specularColor=new U(.2,.2,.1),ft.alpha=.85),ft}const ie=1.5,pt=.4,ke=.05,dt=.45,We=.4,In=.04,Qt=.06,Pt=.04,Ke=.02,ae=(pt-Ke*2)/3,re=.08,An=.04,$t=ie*.35;function Sn(t){const o=En(t),e=ce(t),n=P.CreateBox("tpl_bench_seat",{width:ie,height:ke,depth:ae},t);n.material=o,n.isVisible=!1;const s=P.CreateBox("tpl_bench_back",{width:ie,height:re,depth:In},t);s.material=o,s.isVisible=!1;const i=P.CreateBox("tpl_bench_fl",{width:Qt,height:dt,depth:Pt},t);i.material=e,i.isVisible=!1;const a=dt+We,r=P.CreateBox("tpl_bench_rl",{width:Qt,height:a,depth:Pt},t);r.material=e,r.isVisible=!1;const l=P.CreateBox("tpl_bench_cb",{width:Qt,height:Pt,depth:pt*.8},t);return l.material=e,l.isVisible=!1,{seatSlat:n,backSlat:s,frontLeg:i,rearLeg:r,crossbar:l}}function Rn(t,o,e,n,s,i,a){const r=new Zt(`bench_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;for(let c=0;c<3;c++){const _=t.seatSlat.createInstance(`bench_${e}_s${c}`);_.position.set(0,dt,-pt/2+ae/2+c*(ae+Ke)),_.parent=r}for(let c=0;c<2;c++){const _=t.backSlat.createInstance(`bench_${e}_b${c}`);_.position.set(0,dt+ke/2+.06+re/2+c*(re+An),-pt/2),_.rotation.x=-.21,_.parent=r}const l=dt+We;for(const c of[-1,1]){const _=t.frontLeg.createInstance(`bench_${e}_fl${c}`);_.position.set(c*$t,dt/2,pt/2-Pt/2),_.parent=r;const f=t.rearLeg.createInstance(`bench_${e}_rl${c}`);f.position.set(c*$t,l/2,-pt/2+Pt/2),f.rotation.x=-.1,f.parent=r;const u=t.crossbar.createInstance(`bench_${e}_cb${c}`);u.position.set(c*$t,dt*.35,0),u.parent=r}return r}const gt=4,_t=.12,bn=.4,qt=.28;function Ln(t){const o=ce(t),e=xn(t),n=P.CreateCylinder("tpl_lamp_base",{height:.2,diameterTop:_t*1.5,diameterBottom:_t*2.8,tessellation:8},t);n.material=o,n.isVisible=!1;const s=P.CreateCylinder("tpl_lamp_ring",{height:.12,diameterTop:_t*1.3,diameterBottom:_t*1.5,tessellation:8},t);s.material=o,s.isVisible=!1;const i=P.CreateCylinder("tpl_lamp_pole",{height:gt-.8,diameterTop:_t*.75,diameterBottom:_t,tessellation:8},t);i.material=o,i.isVisible=!1;const a=P.CreateCylinder("tpl_lamp_collar",{height:.08,diameterTop:_t*1.6,diameterBottom:_t*1,tessellation:8},t);a.material=o,a.isVisible=!1;const r=P.CreateCylinder("tpl_lamp_lantern",{height:bn,diameterTop:qt*.7,diameterBottom:qt,tessellation:6},t);r.material=e,r.isVisible=!1;const l=P.CreateCylinder("tpl_lamp_roof",{height:.1,diameterTop:.06,diameterBottom:qt*1.1,tessellation:6},t);l.material=o,l.isVisible=!1;const c=P.CreateCylinder("tpl_lamp_spike",{height:.15,diameterTop:0,diameterBottom:.05,tessellation:6},t);return c.material=o,c.isVisible=!1,{base:n,ring:s,pole:i,collar:a,lantern:r,roof:l,spike:c}}function Nn(t,o,e,n,s,i,a){const r=new Zt(`lamp_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.base.createInstance(`lamp_${e}_base`);l.position.y=.1,l.parent=r;const c=t.ring.createInstance(`lamp_${e}_ring`);c.position.y=.26,c.parent=r;const _=t.pole.createInstance(`lamp_${e}_pole`);_.position.y=.32+(gt-.8)/2,_.parent=r;const f=t.collar.createInstance(`lamp_${e}_col`);f.position.y=gt-.44,f.parent=r;const u=t.lantern.createInstance(`lamp_${e}_lan`);u.position.y=gt-.2,u.parent=r;const E=t.roof.createInstance(`lamp_${e}_roof`);E.position.y=gt,E.parent=r;const h=t.spike.createInstance(`lamp_${e}_spike`);return h.position.y=gt+.125,h.parent=r,r}const j=12,ot=5.5,Kt=1.07;function On(t){const o=pn(t),e=Tn(t),n=gn(t),s=ce(t),i=P.CreateBox("tpl_tc_surf",{width:ot,height:.02,depth:j},t);i.material=o,i.isVisible=!1;const a=P.CreateBox("tpl_tc_bl",{width:ot+.06,height:.005,depth:.06},t);a.material=e,a.isVisible=!1;const r=P.CreateBox("tpl_tc_sl",{width:.06,height:.005,depth:j},t);r.material=e,r.isVisible=!1;const l=P.CreateBox("tpl_tc_cl",{width:.06,height:.005,depth:j*.54},t);l.material=e,l.isVisible=!1;const c=P.CreateBox("tpl_tc_svl",{width:ot/2+.06,height:.005,depth:.06},t);c.material=e,c.isVisible=!1;const _=P.CreateBox("tpl_tc_net",{width:ot+.5,height:Kt,depth:.03},t);_.material=n,_.isVisible=!1;const f=P.CreateCylinder("tpl_tc_post",{height:Kt+.15,diameter:.06,tessellation:8},t);return f.material=s,f.isVisible=!1,{surface:i,baseline:a,sideline:r,centerLine:l,serviceLine:c,net:_,post:f}}function Dn(t,o,e,n,s,i,a){const r=new Zt(`tennis_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.surface.createInstance(`tennis_${e}_surf`);l.position.y=.01,l.parent=r;const c=t.baseline.createInstance(`tennis_${e}_bl0`);c.position.set(0,.025,-j/2),c.parent=r;const _=t.baseline.createInstance(`tennis_${e}_bl1`);_.position.set(0,.025,j/2),_.parent=r;const f=t.sideline.createInstance(`tennis_${e}_sl0`);f.position.set(-ot/2,.025,0),f.parent=r;const u=t.sideline.createInstance(`tennis_${e}_sl1`);u.position.set(ot/2,.025,0),u.parent=r;const E=t.centerLine.createInstance(`tennis_${e}_cl`);E.position.set(0,.025,0),E.parent=r;const h=[[-ot/4,j*.365-j/2],[-ot/4,j*.635-j/2],[ot/4,j*.365-j/2],[ot/4,j*.635-j/2]];for(let p=0;p<h.length;p++){const x=t.serviceLine.createInstance(`tennis_${e}_sv${p}`);x.position.set(h[p][0],.025,h[p][1]),x.parent=r}const g=t.net.createInstance(`tennis_${e}_net`);g.position.set(0,Kt/2,0),g.parent=r;for(const p of[-1,1]){const x=t.post.createInstance(`tennis_${e}_np${p}`);x.position.set(p*(ot/2+.25),(Kt+.15)/2,0),x.parent=r}return r}function Na(t,o,e,n,s,i,a=!1){const r=[],l=[],c=[],_=o.length>0?Sn(t):null,f=e.length>0?Ln(t):null,u=n.length>0?On(t):null,E=s.length>0?hn(t):null;for(let g=0;g<o.length;g++){const{x:p,z:x,rotation:I}=o[g],d=Rn(_,t,g,p,i(p,x),x,I);l.push(d),r.push({x:p,z:x,radius:.8,scoopable:!0})}for(let g=0;g<e.length;g++){const{x:p,z:x,rotation:I}=e[g],d=Nn(f,t,g,p,i(p,x),x,I);l.push(d);const T=c.length;c.push({root:d,tiltX:0,tiltZ:0,tiltVelX:0,tiltVelZ:0}),r.push({x:p,z:x,radius:.3,elasticIndex:T})}for(let g=0;g<n.length;g++){const{x:p,z:x,rotation:I}=n[g];l.push(Dn(u,t,g,p,i(p,x),x,I))}const h=[];for(let g=0;g<s.length;g++){const{x:p,z:x,rotation:I}=s[g],d=mn(E,t,g,p,i(p,x),x,I,a);l.push(d.root),d.primaryLight&&h.push(d.primaryLight),r.push({x:p,z:x,radius:.6})}return{solidObstacles:r,objectRoots:l,elasticObjects:c,floodlightPrimaryLights:h}}export{_a as $,Xi as A,Js as B,Di as C,bi as D,xs as E,bs as F,ys as G,Hi as H,ki as I,Ls as J,pa as K,Ri as L,xa as M,Ys as N,Qs as O,ns as P,Yt as Q,oa as R,Rs as S,Ai as T,$s as U,Wi as V,Fi as W,Ki as X,Si as Y,ca as Z,da as _,Ni as a,Mo as a$,fa as a0,ua as a1,ia as a2,la as a3,ra as a4,aa as a5,qs as a6,ei as a7,ii as a8,ni as a9,pi as aA,gi as aB,Ii as aC,xi as aD,ws as aE,Un as aF,ss as aG,is as aH,Ea as aI,Pn as aJ,xo as aK,Bn as aL,Cn as aM,Fn as aN,Io as aO,Ao as aP,So as aQ,vn as aR,wn as aS,yn as aT,bo as aU,Lo as aV,No as aW,Gn as aX,Ro as aY,Oo as aZ,Do as a_,oi as aa,li as ab,ci as ac,ai as ad,ri as ae,ti as af,si as ag,ta as ah,_s as ai,Kn as aj,Zn as ak,Yn as al,Jn as am,Xn as an,kn as ao,Wn as ap,$n as aq,qn as ar,ts as as,es as at,os as au,jn as av,Qn as aw,_i as ax,mi as ay,ui as az,Li as b,Vn as b0,Hn as b1,zn as b2,Sa as b3,ba as b4,La as b5,Ra as b6,Na as b7,Us as b8,Zs as b9,Ei as bA,Ks as bB,Bs as bC,ks as bD,Fs as bE,Vs as bF,Gs as bG,Cs as bH,Ti as bI,Es as bJ,Ts as bK,vi as bL,sa as bM,na as bN,zs as bO,Hs as bP,fi as bQ,wi as bR,Pi as bS,ha as ba,Aa as bb,Ta as bc,ga as bd,Ia as be,Zi as bf,ps as bg,ms as bh,Is as bi,us as bj,fs as bk,rs as bl,ls as bm,cs as bn,as as bo,vs as bp,Ji as bq,Yi as br,Ws as bs,$i as bt,qi as bu,hi as bv,Bi as bw,yi as bx,Ci as by,di as bz,Oi as c,Ui as d,Mi as e,ea as f,$e as g,Vi as h,zi as i,Gi as j,ds as k,Ss as l,ma as m,Ns as n,As as o,gs as p,hs as q,jo as r,Xs as s,js as t,Ms as u,Ds as v,Os as w,Ps as x,Qi as y,ji as z};
