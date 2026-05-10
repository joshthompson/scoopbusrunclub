import{as as je,at as we,v as Re,y as Vt,am as Qe,C as U,K as Se,ae as te,A as at,D as Xt,X as P,Y as ye,t as st,Z as Zt}from"./BusModel-Dvz4HLhR.js";function $e(t,o,e=2){const n=o&&o.length,s=n?o[0]*e:t.length;let i=Be(t,0,s,e,!0);const a=[];if(!i||i.next===i.prev)return a;let r,l,c;if(n&&(i=no(t,o,i,e)),t.length>80*e){r=t[0],l=t[1];let _=r,f=l;for(let u=e;u<s;u+=e){const m=t[u],h=t[u+1];m<r&&(r=m),h<l&&(l=h),m>_&&(_=m),h>f&&(f=h)}c=Math.max(_-r,f-l),c=c!==0?32767/c:0}return vt(i,a,e,r,l,c,0),a}function Be(t,o,e,n,s){let i;if(s===Eo(t,o,e,n)>0)for(let a=o;a<e;a+=n)i=be(a/n|0,t[a],t[a+1],i);else for(let a=e-n;a>=o;a-=n)i=be(a/n|0,t[a],t[a+1],i);return i&&It(i,i.next)&&(yt(i),i=i.next),i}function Et(t,o){if(!t)return t;o||(o=t);let e=t,n;do if(n=!1,!e.steiner&&(It(e,e.next)||B(e.prev,e,e.next)===0)){if(yt(e),e=o=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==o);return o}function vt(t,o,e,n,s,i,a){if(!t)return;!a&&i&&lo(t,n,s,i);let r=t;for(;t.prev!==t.next;){const l=t.prev,c=t.next;if(i?to(t,n,s,i):qe(t)){o.push(l.i,t.i,c.i),yt(t),t=c.next,r=c.next;continue}if(t=c,t===r){a?a===1?(t=eo(Et(t),o),vt(t,o,e,n,s,i,2)):a===2&&oo(t,o,e,n,s,i):vt(Et(t),o,e,n,s,i,1);break}}}function qe(t){const o=t.prev,e=t,n=t.next;if(B(o,e,n)>=0)return!1;const s=o.x,i=e.x,a=n.x,r=o.y,l=e.y,c=n.y,_=Math.min(s,i,a),f=Math.min(r,l,c),u=Math.max(s,i,a),m=Math.max(r,l,c);let h=n.next;for(;h!==o;){if(h.x>=_&&h.x<=u&&h.y>=f&&h.y<=m&&Ut(s,r,i,l,a,c,h.x,h.y)&&B(h.prev,h,h.next)>=0)return!1;h=h.next}return!0}function to(t,o,e,n){const s=t.prev,i=t,a=t.next;if(B(s,i,a)>=0)return!1;const r=s.x,l=i.x,c=a.x,_=s.y,f=i.y,u=a.y,m=Math.min(r,l,c),h=Math.min(_,f,u),g=Math.max(r,l,c),p=Math.max(_,f,u),I=ee(m,h,o,e,n),A=ee(g,p,o,e,n);let d=t.prevZ,T=t.nextZ;for(;d&&d.z>=I&&T&&T.z<=A;){if(d.x>=m&&d.x<=g&&d.y>=h&&d.y<=p&&d!==s&&d!==a&&Ut(r,_,l,f,c,u,d.x,d.y)&&B(d.prev,d,d.next)>=0||(d=d.prevZ,T.x>=m&&T.x<=g&&T.y>=h&&T.y<=p&&T!==s&&T!==a&&Ut(r,_,l,f,c,u,T.x,T.y)&&B(T.prev,T,T.next)>=0))return!1;T=T.nextZ}for(;d&&d.z>=I;){if(d.x>=m&&d.x<=g&&d.y>=h&&d.y<=p&&d!==s&&d!==a&&Ut(r,_,l,f,c,u,d.x,d.y)&&B(d.prev,d,d.next)>=0)return!1;d=d.prevZ}for(;T&&T.z<=A;){if(T.x>=m&&T.x<=g&&T.y>=h&&T.y<=p&&T!==s&&T!==a&&Ut(r,_,l,f,c,u,T.x,T.y)&&B(T.prev,T,T.next)>=0)return!1;T=T.nextZ}return!0}function eo(t,o){let e=t;do{const n=e.prev,s=e.next.next;!It(n,s)&&Fe(n,e,e.next,s)&&wt(n,s)&&wt(s,n)&&(o.push(n.i,e.i,s.i),yt(e),yt(e.next),e=t=s),e=e.next}while(e!==t);return Et(e)}function oo(t,o,e,n,s,i){let a=t;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&uo(a,r)){let l=Ge(a,r);a=Et(a,a.next),l=Et(l,l.next),vt(a,o,e,n,s,i,0),vt(l,o,e,n,s,i,0);return}r=r.next}a=a.next}while(a!==t)}function no(t,o,e,n){const s=[];for(let i=0,a=o.length;i<a;i++){const r=o[i]*n,l=i<a-1?o[i+1]*n:t.length,c=Be(t,r,l,n,!1);c===c.next&&(c.steiner=!0),s.push(_o(c))}s.sort(so);for(let i=0;i<s.length;i++)e=io(s[i],e);return e}function so(t,o){let e=t.x-o.x;if(e===0&&(e=t.y-o.y,e===0)){const n=(t.next.y-t.y)/(t.next.x-t.x),s=(o.next.y-o.y)/(o.next.x-o.x);e=n-s}return e}function io(t,o){const e=ao(t,o);if(!e)return o;const n=Ge(e,t);return Et(n,n.next),Et(e,e.next)}function ao(t,o){let e=o;const n=t.x,s=t.y;let i=-1/0,a;if(It(t,e))return e;do{if(It(t,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){const f=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=n&&f>i&&(i=f,a=e.x<e.next.x?e:e.next,f===n))return a}e=e.next}while(e!==o);if(!a)return null;const r=a,l=a.x,c=a.y;let _=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Ce(s<c?n:i,s,l,c,s<c?i:n,s,e.x,e.y)){const f=Math.abs(s-e.y)/(n-e.x);wt(e,t)&&(f<_||f===_&&(e.x>a.x||e.x===a.x&&ro(a,e)))&&(a=e,_=f)}e=e.next}while(e!==r);return a}function ro(t,o){return B(t.prev,t,o.prev)<0&&B(o.next,t,t.next)<0}function lo(t,o,e,n){let s=t;do s.z===0&&(s.z=ee(s.x,s.y,o,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==t);s.prevZ.nextZ=null,s.prevZ=null,co(s)}function co(t){let o,e=1;do{let n=t,s;t=null;let i=null;for(o=0;n;){o++;let a=n,r=0;for(let c=0;c<e&&(r++,a=a.nextZ,!!a);c++);let l=e;for(;r>0||l>0&&a;)r!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,r--):(s=a,a=a.nextZ,l--),i?i.nextZ=s:t=s,s.prevZ=i,i=s;n=a}i.nextZ=null,e*=2}while(o>1);return t}function ee(t,o,e,n,s){return t=(t-e)*s|0,o=(o-n)*s|0,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,o=(o|o<<8)&16711935,o=(o|o<<4)&252645135,o=(o|o<<2)&858993459,o=(o|o<<1)&1431655765,t|o<<1}function _o(t){let o=t,e=t;do(o.x<e.x||o.x===e.x&&o.y<e.y)&&(e=o),o=o.next;while(o!==t);return e}function Ce(t,o,e,n,s,i,a,r){return(s-a)*(o-r)>=(t-a)*(i-r)&&(t-a)*(n-r)>=(e-a)*(o-r)&&(e-a)*(i-r)>=(s-a)*(n-r)}function Ut(t,o,e,n,s,i,a,r){return!(t===a&&o===r)&&Ce(t,o,e,n,s,i,a,r)}function uo(t,o){return t.next.i!==o.i&&t.prev.i!==o.i&&!fo(t,o)&&(wt(t,o)&&wt(o,t)&&ho(t,o)&&(B(t.prev,t,o.prev)||B(t,o.prev,o))||It(t,o)&&B(t.prev,t,t.next)>0&&B(o.prev,o,o.next)>0)}function B(t,o,e){return(o.y-t.y)*(e.x-o.x)-(o.x-t.x)*(e.y-o.y)}function It(t,o){return t.x===o.x&&t.y===o.y}function Fe(t,o,e,n){const s=zt(B(t,o,e)),i=zt(B(t,o,n)),a=zt(B(e,n,t)),r=zt(B(e,n,o));return!!(s!==i&&a!==r||s===0&&Ht(t,e,o)||i===0&&Ht(t,n,o)||a===0&&Ht(e,t,n)||r===0&&Ht(e,o,n))}function Ht(t,o,e){return o.x<=Math.max(t.x,e.x)&&o.x>=Math.min(t.x,e.x)&&o.y<=Math.max(t.y,e.y)&&o.y>=Math.min(t.y,e.y)}function zt(t){return t>0?1:t<0?-1:0}function fo(t,o){let e=t;do{if(e.i!==t.i&&e.next.i!==t.i&&e.i!==o.i&&e.next.i!==o.i&&Fe(e,e.next,t,o))return!0;e=e.next}while(e!==t);return!1}function wt(t,o){return B(t.prev,t,t.next)<0?B(t,o,t.next)>=0&&B(t,t.prev,o)>=0:B(t,o,t.prev)<0||B(t,t.next,o)<0}function ho(t,o){let e=t,n=!1;const s=(t.x+o.x)/2,i=(t.y+o.y)/2;do e.y>i!=e.next.y>i&&e.next.y!==e.y&&s<(e.next.x-e.x)*(i-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==t);return n}function Ge(t,o){const e=oe(t.i,t.x,t.y),n=oe(o.i,o.x,o.y),s=t.next,i=o.prev;return t.next=o,o.prev=t,e.next=s,s.prev=e,n.next=e,e.prev=n,i.next=n,n.prev=i,n}function be(t,o,e,n){const s=oe(t,o,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function yt(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ)}function oe(t,o,e){return{i:t,x:o,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Eo(t,o,e,n){let s=0;for(let i=o,a=e-n;i<e;i+=n)s+=(t[a]-t[i])*(t[i+1]+t[a+1]),a=i;return s}function Un(t,o){if(t.length===0)return{positions:[],heights:[],totalDistance:0};const e=Math.PI/180,n=6371e3,s=t[0][1],i=t[0][0],a=Math.cos(s*e),r=[];let l=0;for(let _=0;_<t.length;_++){const f=t[_][0],u=t[_][1],m=(f-i)*e*n*a,h=(u-s)*e*n;if(r.push([m,h]),_>0){const g=r[_][0]-r[_-1][0],p=r[_][1]-r[_-1][1];l+=Math.sqrt(g*g+p*p)}}let c;if(o&&o.length===t.length){const _=Math.min(...o);c=o.map(f=>f-_)}else c=new Array(t.length).fill(0);return{positions:r,heights:c,totalDistance:l}}function Yt(t,o,e){const n=Math.PI/180,s=6371e3,i=Math.cos(e[1]*n),a=(t-e[0])*n*s*i,r=(o-e[1])*n*s;return[a,r]}const mo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAAF4AQMAAABHPlzBAAAABlBMVEVMcD00TiPJke3eAAADwUlEQVR4Ae3dIWzbShgH8P+d7dTJ63vNywIyaZusLiDaSEBBpEnTgWoyjKaCwsLCwoGBg4NVNVAYMFDOgTUOxlG4BsbRyDS1u3lnu/eve+v34/q3d7Ivd1+/a9CGAc0cNAvQzEAzxm8VoOFFqznvx1zxos+cEQRz4ozguiFhBD9kBmEs8SttwZLg1urGrXFrJS96wV1g+qdAk4Fm5wQsSQUWZf/0Nqh5mOgCrqsgT0jyHK51mCfsY/0S58jbrTJHLaJHqHUK16pFdIpaL/3RXb0GzZMoo6eIQQqaA9A8tWDZA80AbaSGE83fwPGj42djjNYb2rZQVcGXI1XcmBBtEE6F6zIbcDk1NQ/9nDT1/OpGPTEEzb+g2bnLD8mcF52CJjVg0RYSzbcEi9qAZguaCg2IAWjUGDQb0HwCzSlozlBrnxc9BU2Oh0wVUb47pv/o8xgnThvaxKrKF02bkJkBSyq7So5HoBmBZs/yT4/9R+9HWf/fhUMXtGhl4DPpuP1QFj4jgxZaRQ8srcK6E3/tRYgeKfB8AM06vmghhNBR1l6UibLgbdGLcZTRF6A5As0KNUredYQX9/M8W/BuV8x5T+X0ttFSis+jvO3zCjTP+FUhQMM1LIJEK6DVVZOL5k/I41mT8m7aZelON00KRJnv2dJw6UbR2tdVkBg4VNUkGr5odVwf7eWJ/gaabZTRG8SgiLK15Sto3t2XNqJ9XvQUNLP+owWL5m0LVUFrqNVV8N9/4HwGT4LP8c/o3b+3D0iUUTbEre7yQ9LwogvQ8PsJJJpKWbjkPobwWYImt2DJwIsuwJIYuP4PE23hGvGiUwimIXp7dya8I9eUF53z2oFz/qIz4Z1l/+NF+ybkM2jmsqvkuIyyEew9aFb86BCthXJbr0JD57zot7x7UgdxPuIRnFyEIJWm5R8yCCGEjfKvUusoty9FX1fyCXRJ+zFqTYvG1h1BKJU7AoYt7307QVx94JbX63POu52w5kUXEPJJHn6JM55FurvBG38xquO41KLFEjduN66rFtFT77g0rjlrEZ17K2GJqYv280SrY0Jp8MH1gUsfuPSB55Z2TslAix5Ik1ATKsrozND6vhMbvDSrzY0JSS2tge+fkKVlW/PQl6yp51c3RHfSBz7mFfNyYjSzn1Ki7ykhdkGjo/wXN6oEzZdeDu6HvOiFfE0KhzYxvjuwaKLkRa/BPxyklhad8f7GPSFEe/rAl5a2DxvKrjJal+hE+sAPKdE9fFF8amjR2tK2HwmvFykBjYIQgkrLlRle9Hc+iXVYizXG0gAAAABJRU5ErkJggg==",To="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABDCAMAAABAx6w2AAAABlBMVEXRpnG0iVwaKrObAAAAf0lEQVR42u3ZMQ6DQBAEQfr/n3ZEaOSTMAuiOiRiNb1zJ9hOpQ3YZWjGnjmls0LHGsyndXWaSnEVJxLGUm65uirKv3KsdAt+obKC3p3xN8w14gC4sIv69lzP44hcmxiPv1K2/pVjVXOaRRZI+RF0wz+9+Vw9nEQPWd/SKZgP/QOP+wBJ/lPHwgAAAABJRU5ErkJggg==",go="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAAF4AQMAAABHPlzBAAAABlBMVEVsm1lObzkN5n9tAAADwUlEQVR4Ae3dIWzbShgH8P+d7dTJ63vNywIyaZusLiDaSEBBpEnTgWoyjKaCwsLCwoGBg4NVNVAYMFDOgTUOxlG4BsbRyDS1u3lnu/eve+v34/q3d7Ivd1+/a9CGAc0cNAvQzEAzxm8VoOFFqznvx1zxos+cEQRz4ozguiFhBD9kBmEs8SttwZLg1urGrXFrJS96wV1g+qdAk4Fm5wQsSQUWZf/0Nqh5mOgCrqsgT0jyHK51mCfsY/0S58jbrTJHLaJHqHUK16pFdIpaL/3RXb0GzZMoo6eIQQqaA9A8tWDZA80AbaSGE83fwPGj42djjNYb2rZQVcGXI1XcmBBtEE6F6zIbcDk1NQ/9nDT1/OpGPTEEzb+g2bnLD8mcF52CJjVg0RYSzbcEi9qAZguaCg2IAWjUGDQb0HwCzSlozlBrnxc9BU2Oh0wVUb47pv/o8xgnThvaxKrKF02bkJkBSyq7So5HoBmBZs/yT4/9R+9HWf/fhUMXtGhl4DPpuP1QFj4jgxZaRQ8srcK6E3/tRYgeKfB8AM06vmghhNBR1l6UibLgbdGLcZTRF6A5As0KNUredYQX9/M8W/BuV8x5T+X0ttFSis+jvO3zCjTP+FUhQMM1LIJEK6DVVZOL5k/I41mT8m7aZelON00KRJnv2dJw6UbR2tdVkBg4VNUkGr5odVwf7eWJ/gaabZTRG8SgiLK15Sto3t2XNqJ9XvQUNLP+owWL5m0LVUFrqNVV8N9/4HwGT4LP8c/o3b+3D0iUUTbEre7yQ9LwogvQ8PsJJJpKWbjkPobwWYImt2DJwIsuwJIYuP4PE23hGvGiUwimIXp7dya8I9eUF53z2oFz/qIz4Z1l/+NF+ybkM2jmsqvkuIyyEew9aFb86BCthXJbr0JD57zot7x7UgdxPuIRnFyEIJWm5R8yCCGEjfKvUusoty9FX1fyCXRJ+zFqTYvG1h1BKJU7AoYt7307QVx94JbX63POu52w5kUXEPJJHn6JM55FurvBG38xquO41KLFEjduN66rFtFT77g0rjlrEZ17K2GJqYv280SrY0Jp8MH1gUsfuPSB55Z2TslAix5Ik1ATKsrozND6vhMbvDSrzY0JSS2tge+fkKVlW/PQl6yp51c3RHfSBz7mFfNyYjSzn1Ki7ykhdkGjo/wXN6oEzZdeDu6HvOiFfE0KhzYxvjuwaKLkRa/BPxyklhad8f7GPSFEe/rAl5a2DxvKrjJal+hE+sAPKdE9fFF8amjR2tK2HwmvFykBjYIQgkrLlRle9Hc+iXVYizXG0gAAAABJRU5ErkJggg==",po="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABDCAMAAABAx6w2AAAABlBMVEX/3Zjwt314xiaOAAAAf0lEQVR42u3ZMQ6DQBAEQfr/n3ZEaOSTMAuiOiRiNb1zJ9hOpQ3YZWjGnjmls0LHGsyndXWaSnEVJxLGUm65uirKv3KsdAt+obKC3p3xN8w14gC4sIv69lzP44hcmxiPv1K2/pVjVXOaRRZI+RF0wz+9+Vw9nEQPWd/SKZgP/QOP+wBJ/lPHwgAAAABJRU5ErkJggg==",Io=.6,Ao=.3,xo=.25,Ro=.2,So=.8,bo=-.5,Do=-1,Lo=.5,Pn=.5,vn=.22,wn=.22,yn=.35,Bn=.1,Cn=.1,Fn=.16,Gn=.25,No=-.3,Oo=-1,Mo=.6,Vn=.2,Hn=.2,zn=.32,Uo=.12,Po=.25,vo=.06,wo=.06,yo=.1,Bo=1.5,Co=200,Fo=Math.PI*.8,Go=.3,Vo=1,Ho=.95,zo=.85,ko=.1,Wo=300,Ko=Math.PI*.95,Zo=.1,Yo=.85,Jo=.82,Xo=.7,kn=3,Wn=80,Kn=Math.PI*.7,Zn=.3,Yn=1,Jn=.97,Xn=.85,jn=1.5,Qn=15,$n=Math.PI*.6,qn=1,ts=1,es=.12,os=.08,ns=5,ss=5e3,is=2.5,as=36,rs=12,ls=20,cs=10,_s=3,us=1.12,fs=.4,ds=30,hs=2.5,jo=4.5*2,Es=jo+2,ms=.8,Ts=8,gs=7,ps=.5,Is=2.6,As=3,xs=2,Rs=5.5,Ss=.75,bs=3.5,Ds=.8,Ls=1.3,Ns=8,Os=.75,Ms=10,Us=.5,Ps=.35,vs=2,ws=2,ys=80,Bs=2.5,Cs=20,Fs=20,Gs=.03,Vs=.3,Hs=14,zs=1,ks=.04,Ws=.25,Ks=3,Zs=5,Ys=1.5,Js=15,Xs=15,js=je[1],Qs=we[0],$s=we[1],qs=100,ti=10,ei=250,oi=20,ni=2.4,si=.35,ii=2.5,ai=1.2,ri=.75,li=100,ci=100,_i=1200,ui=90,fi=15,di=2,hi=8,Ei=1.5,mi=.75,Ti=30,gi=2,pi=25,Ii=.5,Ai=30,xi=1,Ri=.4,Si=3e3,bi=200,Di=8,Li=10,Ni=.8,Oi=.9,Mi=.01,Ui=4,Pi=.4,vi=.34,wi=6,yi=.45,Bi=2.5,Ci=.12,Fi=2.5,Gi=1,Vi=12,Hi=1.8,zi=2,ki=.6,Wi=4,Ki=.5,Zi=4,Yi=.55,Ji=.4,Xi=8,ji=-.01,Qi=1.5,$i=-.02,qi=2,ta=3,ea=.03,oa=8192,ht=16,na=500,sa=500,ia=500,aa=500,ra=15,la=15,ca=3,_a=10,ua=20,fa=.5,da=3.5,ha=2,Ea=3,ma=20,Ta=20,ga=50,pa=5,Ia=15,Aa=20,xa=15,Ra=6,Sa=4,ba=20,Da=4,Qo=50,$o=200,qo=1024,tn=2048,en=2048,Bt=250,bt=Bt*6,Dt=Bt*3,De=Bt*.8,Le=Bt*.3,on=`
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
`;function La(t,o){const{pathPositions:e,roads:n=[],trails:s=[],groundSize:i=6e3,pathHalfWidth:a=5,roadHalfWidth:r=a*1.4,edgeSoftness:l=1.5,maskResolution:c=4096,forestTiling:_=600,dirtTiling:f=300,fieldTiling:u=600,sandTiling:m=600,concreteTiling:h=400,startLine:g,startCircle:p,pathTextureUrl:I,fields:A=[],concrete:d=[],regions:T=[],waterZones:F=[]}=o,G=[...A.map(L=>({type:"field",points:L,zIndex:0})),...d.map(L=>({type:"concrete",points:L,zIndex:0})),...T];G.sort((L,x)=>L.zIndex-x.zIndex);const K=t.getEngine().getCaps().maxTextureSize||4096,Z=Math.min(qo,K),Y=Math.min(tn,K),rt=Math.min(en,K),it=jt(t,"lo",Z,e,n,s,i,a,r,l,g,p,-i/2,-i/2,i,i,G,F),Q=e.length>0?e[0][0]:0,$=e.length>0?e[0][1]:0,H=bt/2,J=Dt/2,X=jt(t,"mid",Y,e,n,s,i,a,r,l,g,p,Q-H,$-H,bt,bt,G,F),k=jt(t,"ultra",rt,e,n,s,i,a,r,l,g,p,Q-J,$-J,Dt,Dt,G,F);let lt=Q,At=$,Ct=Q,xt=$;const ut=i/2,mt=(L,x,V)=>{const w=(L-V+ut)/i,ct=(x-V+ut)/i,C=(L+V+ut)/i,St=(x+V+ut)/i;return[w,ct,C,St]};let tt=mt(Q,$,H),et=mt(Q,$,J);const R="tiledPathGround";Re.ShadersStore[R+"VertexShader"]=on,Re.ShadersStore[R+"FragmentShader"]=nn;const S=new Vt(mo,t);S.anisotropicFilteringLevel=ht;const N=new Vt(I??To,t);N.anisotropicFilteringLevel=ht;const D=new Vt(go,t);D.anisotropicFilteringLevel=ht;const b=new Vt(po,t);b.anisotropicFilteringLevel=ht;const E=new Qe(R,t,R,{attributes:["position","normal","uv"],uniforms:["worldViewProjection","world","midBounds","ultraBounds","cameraPosition","cameraPosition2","hasSecondCamera","lodNearDist","lodFarDist","forestTiling","dirtTiling","fieldTiling","sandTiling","concreteTiling","roadColorVal","whiteColorVal","iceColorVal","concreteColorVal","sunDirection","sunIntensity","hemiIntensity","hemiGroundColor","chunkDebug","chunkSizeUV","numSpotLights","spotPositions","spotDirections","spotColors","spotIntensities","spotRanges","spotCosAngles","spotExponents","shadowMatrix","hasShadowMap","shadowLightIndex"],samplers:["mixMap1Lo","mixMap1Mid","mixMap1Ultra","mixMap2Lo","mixMap2Mid","mixMap2Ultra","mixMap3Lo","mixMap3Mid","mixMap3Ultra","forestTex","dirtTex","fieldTex","sandTex","shadowMap"]});E.backFaceCulling=!0,E.setTexture("mixMap1Lo",it.maskTex),E.setTexture("mixMap1Mid",X.maskTex),E.setTexture("mixMap1Ultra",k.maskTex),E.setTexture("mixMap2Lo",it.lineMaskTex),E.setTexture("mixMap2Mid",X.lineMaskTex),E.setTexture("mixMap2Ultra",k.lineMaskTex),E.setTexture("mixMap3Lo",it.zoneMaskTex),E.setTexture("mixMap3Mid",X.zoneMaskTex),E.setTexture("mixMap3Ultra",k.zoneMaskTex),E.setTexture("forestTex",S),E.setTexture("dirtTex",N),E.setTexture("fieldTex",D),E.setTexture("sandTex",b),E.setVector3("roadColorVal",kt("#606066")),E.setVector3("whiteColorVal",kt("#ffffff")),E.setVector3("iceColorVal",kt("#85d2ff")),E.setVector3("concreteColorVal",kt("#909090")),E.setFloat("forestTiling",_),E.setFloat("dirtTiling",f),E.setFloat("fieldTiling",u),E.setFloat("sandTiling",m),E.setFloat("concreteTiling",h);const O=(L,x,V,w)=>({x:L,y:x,z:V,w});E.setVector4("midBounds",O(tt[0],tt[1],tt[2],tt[3])),E.setVector4("ultraBounds",O(et[0],et[1],et[2],et[3])),E.setFloat("lodNearDist",Qo),E.setFloat("lodFarDist",$o),E.setVector3("cameraPosition",{x:0,y:0,z:0}),E.setVector3("cameraPosition2",{x:0,y:0,z:0}),E.setFloat("hasSecondCamera",0);const v=o.isNight??!1,M=v?new U(No,Oo,Mo):new U(bo,Do,Lo),z=Math.sqrt(M.r*M.r+M.g*M.g+M.b*M.b);E.setVector3("sunDirection",{x:M.r/z,y:M.g/z,z:M.b/z}),E.setFloat("sunIntensity",v?Uo:So),E.setFloat("hemiIntensity",v?Po:Io),E.setVector3("hemiGroundColor",v?{x:vo,y:wo,z:yo}:{x:Ao,y:xo,z:Ro}),E.setFloat("chunkDebug",0),E.setFloat("chunkSizeUV",Bt/i),E.setFloat("hasShadowMap",0),E.setInt("shadowLightIndex",-1),E.setMatrix("shadowMatrix",Se.Identity());const y=12,W=new Float32Array(y*3),nt=new Float32Array(y*3),Ft=new Float32Array(y*3),Rt=new at,_e=new Float32Array(y),ue=new Float32Array(y),fe=new Float32Array(y),de=new Float32Array(y);E.setInt("numSpotLights",0);let Jt=null,Gt=null,he=null;const Ee=new Se;E.onBind=()=>{const L=t.lights;let x=0,V=-1;for(let ct=0;ct<L.length&&x<y;ct++){const C=L[ct];if(!(C instanceof te)||!C.isEnabled())continue;C===he&&(V=x);const St=C.getAbsolutePosition(),q=x*3;W[q]=St.x,W[q+1]=St.y,W[q+2]=St.z,C.parent?(at.TransformNormalToRef(C.direction,C.parent.getWorldMatrix(),Rt),Rt.normalize(),nt[q]=Rt.x,nt[q+1]=Rt.y,nt[q+2]=Rt.z):(nt[q]=C.direction.x,nt[q+1]=C.direction.y,nt[q+2]=C.direction.z),Ft[q]=C.diffuse.r,Ft[q+1]=C.diffuse.g,Ft[q+2]=C.diffuse.b,_e[x]=C.intensity,ue[x]=C.range,fe[x]=Math.cos(C.angle*.5),de[x]=C.exponent,x++}const w=E.getEffect();w&&(w.setInt("numSpotLights",x),x>0&&(w.setArray3("spotPositions",Array.from(W.subarray(0,x*3))),w.setArray3("spotDirections",Array.from(nt.subarray(0,x*3))),w.setArray3("spotColors",Array.from(Ft.subarray(0,x*3))),w.setFloatArray("spotIntensities",_e.subarray(0,x)),w.setFloatArray("spotRanges",ue.subarray(0,x)),w.setFloatArray("spotCosAngles",fe.subarray(0,x)),w.setFloatArray("spotExponents",de.subarray(0,x))),w.setFloat3("cameraPosition",me,Te,ge),w.setFloat3("cameraPosition2",pe,Ie,Ae),w.setFloat("hasSecondCamera",xe),Jt&&Gt&&V>=0?(Gt.getViewMatrix().multiplyToRef(Gt.getProjectionMatrix(),Ee),w.setMatrix("shadowMatrix",Ee),w.setFloat("hasShadowMap",1),w.setInt("shadowLightIndex",V),w.setTexture("shadowMap",Jt)):w.setFloat("hasShadowMap",0))};let me=0,Te=0,ge=0;const Ze=(L,x,V)=>{me=L,Te=x,ge=V};let pe=0,Ie=0,Ae=0,xe=0;const Ye=(L,x,V)=>{pe=L,Ie=x,Ae=V,xe=1},Je=L=>{it.setIcePatches(L),X.setIcePatches(L),k.setIcePatches(L)},Xe=(L,x)=>{const V=L-lt,w=x-At;V*V+w*w>=De*De&&(lt=L,At=x,Ne(X,Y,e,n,s,i,a,r,l,g,p,L-H,x-H,bt,bt,G,F),tt=mt(L,x,H),E.setVector4("midBounds",{x:tt[0],y:tt[1],z:tt[2],w:tt[3]}));const ct=L-Ct,C=x-xt;ct*ct+C*C>=Le*Le&&(Ct=L,xt=x,Ne(k,rt,e,n,s,i,a,r,l,g,p,L-J,x-J,Dt,Dt,G,F),et=mt(L,x,J),E.setVector4("ultraBounds",{x:et[0],y:et[1],z:et[2],w:et[3]}))};return E.__setIcePatches=Je,E.__updateInsetCenter=Xe,E.__setViewCenter=Ze,E.__setViewCenter2=Ye,E.__setShadowMap=(L,x,V)=>{Jt=L,Gt=x,he=V},E}function jt(t,o,e,n,s,i,a,r,l,c,_,f,u,m,h,g,p=[],I=[]){const A=e,d=new Xt(`pathMask_${o}`,A,t,!1),T=d.getContext(),F=new Xt(`lineMask_${o}`,A,t,!1),G=F.getContext(),K=new Xt(`zoneMask_${o}`,A,t,!1),Z=K.getContext();d.anisotropicFilteringLevel=ht,F.anisotropicFilteringLevel=ht,K.anisotropicFilteringLevel=ht,He(T,G,Z,A,n,s,i,a,r,l,c,_,f,u,m,h,g,p,I);const Y=document.createElement("canvas");return Y.width=A,Y.height=A,Y.getContext("2d").drawImage(G.canvas,0,0),d.update(),F.update(),K.update(),{maskTex:d,lineMaskTex:F,zoneMaskTex:K,staticLineCanvas:Y,setIcePatches:Q=>{G.clearRect(0,0,A,A),G.drawImage(Y,0,0);const $=Ve(u,m,h,g,A);for(const H of Q){if(H.alpha<=0||H.radius<=0)continue;const[J,X]=$(H.x,H.z),k=H.radius/h*A;if(J+k<0||J-k>A||X+k<0||X-k>A)continue;const lt=Math.max(0,Math.min(255,Math.round(H.alpha*255)));G.fillStyle=`rgb(0, ${lt}, 0)`,G.beginPath(),G.arc(J,X,k,0,Math.PI*2),G.fill()}F.update()},worldMinX:u,worldMinZ:m,worldW:h,worldH:g}}function Ne(t,o,e,n,s,i,a,r,l,c,_,f,u,m,h,g=[],p=[]){const I=o,A=t.maskTex.getContext(),d=t.lineMaskTex.getContext(),T=t.zoneMaskTex.getContext();He(A,d,T,I,e,n,s,i,a,r,l,c,_,f,u,m,h,g,p);const F=t.staticLineCanvas.getContext("2d");F.clearRect(0,0,I,I),F.drawImage(d.canvas,0,0),t.maskTex.update(),t.lineMaskTex.update(),t.zoneMaskTex.update(),t.worldMinX=f,t.worldMinZ=u,t.worldW=m,t.worldH=h}function Ve(t,o,e,n,s){return(i,a)=>{const r=(i-t)/e*s,l=(o+n-a)/n*s;return[r,l]}}const Oe=10,Me=.35;function sn(t,o,e){if(o.length<2)return;if(o.length===2){const[l,c]=e(o[0][0],o[0][1]),[_,f]=e(o[1][0],o[1][1]);t.moveTo(l,c),t.lineTo(_,f);return}const n=[];for(let l=0;l<o.length-1;l++){const c=o[l+1][0]-o[l][0],_=o[l+1][1]-o[l][1];n.push(Math.sqrt(c*c+_*_))}const[s,i]=e(o[0][0],o[0][1]);t.moveTo(s,i);for(let l=1;l<o.length-1;l++){const c=n[l-1],_=n[l],f=Math.min(Oe,c*Me),u=Math.min(Oe,_*Me),[m,h]=o[l],[g,p]=o[l-1],[I,A]=o[l+1],d=m-g,T=h-p,F=c>0?1-f/c:1,G=g+d*F,K=p+T*F,Z=I-m,Y=A-h,rt=_>0?u/_:0,it=m+Z*rt,Q=h+Y*rt,[$,H]=e(G,K);t.lineTo($,H);const[J,X]=e(m,h),[k,lt]=e(it,Q);t.quadraticCurveTo(J,X,k,lt)}const[a,r]=e(o[o.length-1][0],o[o.length-1][1]);t.lineTo(a,r)}function He(t,o,e,n,s,i,a,r,l,c,_,f,u,m,h,g,p,I=[],A=[]){const d=Ve(m,h,g,p,n);t.fillStyle="rgb(255, 0, 0)",t.fillRect(0,0,n,n),o.fillStyle="rgb(0, 0, 0)",o.fillRect(0,0,n,n),e.fillStyle="rgb(0, 0, 0)",e.fillRect(0,0,n,n);const T=R=>R/g*n,F=6,G=10,K=[...I].sort((R,S)=>R.zIndex-S.zIndex);for(const R of K){const S=R.points;if(!(S.length<3))if(R.type==="concrete"){const N=T(F);e.globalCompositeOperation="source-over",e.beginPath();for(let b=0;b<S.length;b++){const[E,O]=d(S[b][0],S[b][1]);b===0?e.moveTo(E,O):e.lineTo(E,O)}e.closePath(),e.fillStyle="rgb(0, 0, 0)",e.fill(),o.globalCompositeOperation="lighten";const D=(b,E)=>{o.beginPath();for(let O=0;O<S.length;O++){const[v,M]=d(S[O][0],S[O][1]);O===0?o.moveTo(v,M):o.lineTo(v,M)}o.closePath(),E!==void 0?(o.lineWidth=E,o.lineJoin="round",o.strokeStyle=b,o.stroke()):(o.fillStyle=b,o.fill())};D("rgb(0, 0, 160)",N*2),D("rgb(0, 0, 200)",N*1.2),D("rgb(0, 0, 235)",N*.5),D("rgb(0, 0, 255)"),o.globalCompositeOperation="source-over"}else{const N=T(G);o.globalCompositeOperation="source-over",o.beginPath();for(let b=0;b<S.length;b++){const[E,O]=d(S[b][0],S[b][1]);b===0?o.moveTo(E,O):o.lineTo(E,O)}o.closePath(),o.fillStyle="rgb(0, 0, 0)",o.fill(),e.globalCompositeOperation="lighten";const D=(b,E)=>{e.beginPath();for(let O=0;O<S.length;O++){const[v,M]=d(S[O][0],S[O][1]);O===0?e.moveTo(v,M):e.lineTo(v,M)}e.closePath(),E!==void 0?(e.lineWidth=E,e.lineJoin="round",e.strokeStyle=b,e.stroke()):(e.fillStyle=b,e.fill())};D("rgb(160, 0, 0)",N*2),D("rgb(200, 0, 0)",N*1.2),D("rgb(235, 0, 0)",N*.5),D("rgb(255, 0, 0)"),e.globalCompositeOperation="source-over"}}if(A.length>0){const N=T(20),D=T(8);e.globalCompositeOperation="lighten";for(const b of A){if(b.points.length<3)continue;const E=Math.max(0,Math.min(255,Math.round((b.y+100)/200*255))),O=(v,M)=>{const z=`rgb(0, ${M}, ${E})`;e.lineWidth=v,e.lineJoin="round",e.strokeStyle=z,e.beginPath();for(let y=0;y<b.points.length;y++){const[W,nt]=d(b.points[y][0],b.points[y][1]);y===0?e.moveTo(W,nt):e.lineTo(W,nt)}e.closePath(),e.stroke()};O(N*2+D*2,100),O(N*2+D,180),O(N*2,255),e.fillStyle=`rgb(0, 255, ${E})`,e.beginPath();for(let v=0;v<b.points.length;v++){const[M,z]=d(b.points[v][0],b.points[v][1]);v===0?e.moveTo(M,z):e.lineTo(M,z)}e.closePath(),e.fill()}e.globalCompositeOperation="source-over"}if(s.length<2)return;const Z=(R,S,N,D=t)=>{R.length<2||(D.lineWidth=S,D.lineCap="round",D.lineJoin="round",D.strokeStyle=N,D.beginPath(),sn(D,R,d),D.stroke())},Y=(R,S,N,D)=>{t.lineWidth=N,t.lineCap="round",t.lineJoin="round",t.strokeStyle=D,t.beginPath(),t.moveTo(R[0],R[1]),t.lineTo(S[0],S[1]),t.stroke()},rt=c*2+_*1.2,it=T(rt),Q=c*2+_*.4,$=T(Q),H=c*2,J=T(H);t.globalCompositeOperation="lighten";for(const R of i)Z(R,it,"rgb(255, 140, 0)"),Z(R,$,"rgb(255, 210, 0)"),Z(R,J,"rgb(255, 255, 0)");t.globalCompositeOperation="source-over";const X=(l+_)*2,k=T(X);Z(s,k,"rgb(255, 0, 115)");const lt=(l+_*.4)*2,At=T(lt);Z(s,At,"rgb(255, 0, 179)");const Ct=l*2,xt=T(Ct);Z(s,xt,"rgb(255, 0, 255)");const ut=l*.4,mt=(ut+_*.4)*2,tt=T(mt),et=T(ut*2);t.globalCompositeOperation="lighten";for(const R of a)Z(R,tt,"rgb(255, 0, 60)"),Z(R,et,"rgb(255, 0, 110)");if(t.globalCompositeOperation="source-over",u&&s.length>0){const R=s[0][0]-u.x,S=s[0][1]-u.z,N=Math.sqrt(R*R+S*S);if(N>.001){const D=R/N,b=S/N,E=d(s[0][0],s[0][1]),O=d(u.x+D*Math.max(0,u.radius-(l+_)),u.z+b*Math.max(0,u.radius-(l+_))),v=d(u.x+D*Math.max(0,u.radius-(l+_*.4)),u.z+b*Math.max(0,u.radius-(l+_*.4))),M=d(u.x+D*Math.max(0,u.radius-l),u.z+b*Math.max(0,u.radius-l));t.globalCompositeOperation="lighten",Y(O,E,k,"rgb(255, 0, 115)"),Y(v,E,At,"rgb(255, 0, 179)"),Y(M,E,xt,"rgb(255, 0, 255)"),t.globalCompositeOperation="source-over"}}if(u){const[R,S]=d(u.x,u.z),N=T(u.radius);t.globalCompositeOperation="lighten";const D=N+T(_);t.beginPath(),t.arc(R,S,D,0,Math.PI*2),t.fillStyle="rgb(255, 0, 115)",t.fill();const b=N+T(_*.4);t.beginPath(),t.arc(R,S,b,0,Math.PI*2),t.fillStyle="rgb(255, 0, 179)",t.fill(),t.beginPath(),t.arc(R,S,N,0,Math.PI*2),t.fillStyle="rgb(255, 0, 255)",t.fill(),t.globalCompositeOperation="source-over"}if(f){const{x:R,z:S,yaw:N,width:D,thickness:b=.4}=f,E=Math.cos(N),O=-Math.sin(N),v=Math.sin(N),M=Math.cos(N),z=D/2,y=b/2,W=[d(R-E*z-v*y,S-O*z-M*y),d(R+E*z-v*y,S+O*z-M*y),d(R+E*z+v*y,S+O*z+M*y),d(R-E*z+v*y,S-O*z+M*y)];o.fillStyle="rgb(255, 0, 0)",o.beginPath(),o.moveTo(W[0][0],W[0][1]),o.lineTo(W[1][0],W[1][1]),o.lineTo(W[2][0],W[2][1]),o.lineTo(W[3][0],W[3][1]),o.closePath(),o.fill()}}function kt(t){const o=parseInt(t.slice(1,3),16)/255,e=parseInt(t.slice(3,5),16)/255,n=parseInt(t.slice(5,7),16)/255;return{x:o,y:e,z:n}}function ze(t,o){const e=new st(o,t);return e.diffuseColor=new U(.1,.4,.75),e.specularColor=new U(.4,.4,.5),e.alpha=.85,e}function an(t,o,e,n=.02){if(e.length<3)return null;const s=e.map(([i,a])=>new at(i,0,a));try{const i=P.CreatePolygon(o,{shape:s,sideOrientation:ye.DOUBLESIDE},t,$e);return i.position.y=n,i.material=ze(t,`${o}_mat`),i}catch(i){return console.warn(`[water] Failed to create polygon ${o}:`,i),null}}function rn(t,o,e,n,s=.02){if(e.length<2)return null;const i=[],a=[],r=n/2;for(let l=0;l<e.length;l++){const[c,_]=e[l];let f,u;l===0?(f=e[1][0]-c,u=e[1][1]-_):l===e.length-1?(f=c-e[l-1][0],u=_-e[l-1][1]):(f=e[l+1][0]-e[l-1][0],u=e[l+1][1]-e[l-1][1]);const m=Math.sqrt(f*f+u*u)||1,h=-u/m,g=f/m;i.push(new at(c+h*r,s,_+g*r)),a.push(new at(c-h*r,s,_-g*r))}try{const l=P.CreateRibbon(o,{pathArray:[i,a],sideOrientation:ye.DOUBLESIDE},t);return l.material=ze(t,`${o}_mat`),l}catch(l){return console.warn(`[water] Failed to create ribbon ${o}:`,l),null}}function Na(t){return()=>{t|=0,t=t+1831565813|0;let o=Math.imul(t^t>>>15,1|t);return o=o+Math.imul(o^o>>>7,61|o)^o,((o^o>>>14)>>>0)/4294967296}}function ln(t,o,e,n,s){const i=s*s,a=i*s;return .5*(2*o+(-t+e)*s+(2*t-5*o+4*e-n)*i+(-t+3*o-3*e+n)*a)}function Oa(t,o,e,n){if(t.length===0)return[];const s=Math.min(...t.map(i=>i[2]));return t.map(([i,a,r])=>{const[l,c]=Yt(a,i,o);return{x:l*e,z:c*e,h:(r-s)*n}})}function Ma(t,o,e,n=12){const s=e.length;if(s===0)return 0;if(s===1)return e[0].h;const i=[];for(let c=0;c<s;c++){const _=t-e[c].x,f=o-e[c].z,u=_*_+f*f;i.push({dist2:u,h:e[c].h})}if(i.sort((c,_)=>c.dist2-_.dist2),i[0].dist2<.001)return i[0].h;const a=Math.min(n,s);let r=0,l=0;for(let c=0;c<a;c++){const _=1/i[c].dist2;r+=_,l+=_*i[c].h}return l/r}function Ua(t,o,e,n){const s=e.length;if(s===0)return 0;if(s===1)return n[0]??0;let i=1/0,a=0,r=0;for(let u=0;u<s-1;u++){const[m,h]=e[u],[g,p]=e[u+1],I=g-m,A=p-h,d=I*I+A*A;let T=d>0?((t-m)*I+(o-h)*A)/d:0;T=Math.max(0,Math.min(1,T));const F=m+T*I,G=h+T*A,K=(t-F)**2+(o-G)**2;K<i&&(i=K,a=u,r=T)}const l=Math.max(0,a-1),c=a,_=Math.min(s-1,a+1),f=Math.min(s-1,a+2);return ln(n[l],n[c],n[_],n[f],r)}function le(t,o,e){let n=!1;for(let s=0,i=e.length-1;s<e.length;i=s++){const[a,r]=e[s],[l,c]=e[i];r>o!=c>o&&t<(l-a)*(o-r)/(c-r)+a&&(n=!n)}return n}function cn(t,o,e){let n=1/0;for(let s=0,i=e.length-1;s<e.length;i=s++){const[a,r]=e[i],[l,c]=e[s],_=l-a,f=c-r,u=_*_+f*f;let m=u>0?((t-a)*_+(o-r)*f)/u:0;m=Math.max(0,Math.min(1,m));const h=Math.sqrt((t-(a+m*_))**2+(o-(r+m*f))**2);h<n&&(n=h)}return n}function Pa(t,o,e){let n=1/0;for(let s=0;s<e.length-1;s++){const[i,a]=e[s],[r,l]=e[s+1],c=r-i,_=l-a,f=c*c+_*_;let u=f>0?((t-i)*c+(o-a)*_)/f:0;u=Math.max(0,Math.min(1,u));const m=i+u*c,h=a+u*_,g=Math.sqrt((t-m)**2+(o-h)**2);g<n&&(n=g)}return n}function va(t,o,e){for(const n of e)if(le(t,o,n.points))return!0;return!1}function wa(t,o,e){for(const n of e)if(le(t,o,n.points))return n.y;return null}function ya(t,o,e,n){for(const i of e){let a=1/0,r=-1/0,l=1/0,c=-1/0;for(const[m,h]of i.points)m<a&&(a=m),m>r&&(r=m),h<l&&(l=h),h>c&&(c=h);if(t<a-15||t>r+15||o<l-15||o>c+15)continue;const _=le(t,o,i.points),f=i.y-2;if(_)return f;const u=cn(t,o,i.points);if(u<15){const m=n(t,o)-.08,h=u/15;return m*h+f*(1-h)}}return null}function Ba(t,o,e,n){const s=[];console.log(`[water] Processing ${t.length} water features`);for(const i of t){const a=i.coords.map(([l,c])=>{const[_,f]=Yt(l,c,o);return[_*e,f*e]});let r=1/0;for(const[l,c]of a){const _=n(l,c);_<r&&(r=_)}isFinite(r)||(r=0),s.push({points:a,y:r+.1})}return console.log(`[water] ${s.length} water zones stored`),s}function Ca(t,o){for(let e=0;e<o.length;e++){const n=o[e];n.points.length>=3?an(t,`water_${e}`,n.points,n.y):n.points.length>=2&&rn(t,`water_${e}`,n.points,20,n.y)}}function Fa(t,o,e){const n=[];for(const s of t){if(s.length<2)continue;const i=s.map(([a,r])=>{const[l,c]=Yt(r,a,o);return[l*e,c*e]});i.length>=2&&n.push(i)}return n}function Ga(t,o,e){const n=[];for(const s of t){if(s.points.length<3)continue;const i=s.points.map(([a,r])=>{const[l,c]=Yt(r,a,o);return[l*e,c*e]});i.length>=3&&n.push({type:s.type,height:s.height,points:i})}return n}const ne=25,_n=.4,un=.18,Wt=.5,Ue=1.4,Pe=2,se=.8,ve=1.2,fn=1.2,dn=.1;function hn(t){const o=new st("flSteelMat",t);o.diffuseColor=new U(.5,.52,.55),o.specularColor=new U(.15,.15,.15);const e=new st("flDarkMat",t);e.diffuseColor=new U(.12,.12,.14),e.specularColor=new U(.08,.08,.08);const n=new st("flLensMat",t);n.diffuseColor=new U(1,.98,.9),n.emissiveColor=new U(.8,.75,.55),n.specularColor=new U(.3,.3,.2),n.alpha=.9;const s=P.CreateCylinder("tpl_fl_base",{height:Wt,diameterTop:Ue*.85,diameterBottom:Ue,tessellation:8},t);s.material=o,s.isVisible=!1;const i=P.CreateCylinder("tpl_fl_mast",{height:ne,diameterTop:un,diameterBottom:_n,tessellation:8},t);i.material=o,i.isVisible=!1;const a=P.CreateCylinder("tpl_fl_bracket",{height:fn,diameter:dn,tessellation:6},t);a.material=o,a.isVisible=!1;const r=P.CreateBox("tpl_fl_housing",{width:Pe,height:se,depth:ve},t);r.material=e,r.isVisible=!1;const l=P.CreateBox("tpl_fl_lens",{width:Pe*.85,height:.08,depth:ve*.8},t);return l.material=n,l.isVisible=!1,{base:s,mast:i,bracket:a,housing:r,lens:l}}function En(t,o,e,n,s,i,a,r){const l=new Zt(`floodlight_${e}`,o);l.position.set(n,s,i),l.rotation.y=a;const c=t.base.createInstance(`fl_${e}_base`);c.position.y=Wt/2,c.parent=l;const _=t.mast.createInstance(`fl_${e}_mast`);_.position.y=Wt+ne/2,_.parent=l;const f=Wt+ne,u=t.bracket.createInstance(`fl_${e}_bracket`);u.position.set(0,f-.1,0),u.rotation.x=.3,u.parent=l;const m=f+se*.5+.1,h=t.housing.createInstance(`fl_${e}_housing`);h.position.set(0,m,0),h.parent=l;const g=t.lens.createInstance(`fl_${e}_lens`);g.position.set(0,m-se*.5-.04,0),g.parent=l;let p=null;if(r){const I=m-.1,A=new te(`fl_${e}_primary`,new at(0,I,0),new at(0,-1,.1),Fo,Go,o);A.diffuse=new U(Vo,Ho,zo),A.intensity=Bo,A.range=Co,A.parent=l,p=A;const d=new te(`fl_${e}_soft`,new at(0,I,0),new at(0,-1,.05),Ko,Zo,o);d.diffuse=new U(Yo,Jo,Xo),d.intensity=ko,d.range=Wo,d.parent=l}return{root:l,primaryLight:p}}let Lt=null,Nt=null,Ot=null,Tt=null,Mt=null,ft=null;function mn(t){return Lt||(Lt=new st("objWood",t),Lt.diffuseColor=new U(.48,.32,.18),Lt.specularColor=new U(.06,.04,.02)),Lt}function ce(t){return Nt||(Nt=new st("objIron",t),Nt.diffuseColor=new U(.18,.18,.2),Nt.specularColor=new U(.1,.1,.12)),Nt}function Tn(t){return Ot||(Ot=new st("objWhite",t),Ot.diffuseColor=new U(.92,.92,.92),Ot.specularColor=new U(.1,.1,.1)),Ot}function gn(t){return Tt||(Tt=new st("objNet",t),Tt.diffuseColor=new U(.85,.85,.85),Tt.specularColor=U.Black(),Tt.alpha=.6),Tt}function pn(t){return Mt||(Mt=new st("objCourt",t),Mt.diffuseColor=new U(.22,.42,.22),Mt.specularColor=U.Black()),Mt}function In(t){return ft||(ft=new st("objGlass",t),ft.diffuseColor=new U(.85,.82,.6),ft.emissiveColor=new U(.35,.32,.15),ft.specularColor=new U(.2,.2,.1),ft.alpha=.85),ft}const ie=1.5,pt=.4,ke=.05,dt=.45,We=.4,An=.04,Qt=.06,Pt=.04,Ke=.02,ae=(pt-Ke*2)/3,re=.08,xn=.04,$t=ie*.35;function Rn(t){const o=mn(t),e=ce(t),n=P.CreateBox("tpl_bench_seat",{width:ie,height:ke,depth:ae},t);n.material=o,n.isVisible=!1;const s=P.CreateBox("tpl_bench_back",{width:ie,height:re,depth:An},t);s.material=o,s.isVisible=!1;const i=P.CreateBox("tpl_bench_fl",{width:Qt,height:dt,depth:Pt},t);i.material=e,i.isVisible=!1;const a=dt+We,r=P.CreateBox("tpl_bench_rl",{width:Qt,height:a,depth:Pt},t);r.material=e,r.isVisible=!1;const l=P.CreateBox("tpl_bench_cb",{width:Qt,height:Pt,depth:pt*.8},t);return l.material=e,l.isVisible=!1,{seatSlat:n,backSlat:s,frontLeg:i,rearLeg:r,crossbar:l}}function Sn(t,o,e,n,s,i,a){const r=new Zt(`bench_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;for(let c=0;c<3;c++){const _=t.seatSlat.createInstance(`bench_${e}_s${c}`);_.position.set(0,dt,-pt/2+ae/2+c*(ae+Ke)),_.parent=r}for(let c=0;c<2;c++){const _=t.backSlat.createInstance(`bench_${e}_b${c}`);_.position.set(0,dt+ke/2+.06+re/2+c*(re+xn),-pt/2),_.rotation.x=-.21,_.parent=r}const l=dt+We;for(const c of[-1,1]){const _=t.frontLeg.createInstance(`bench_${e}_fl${c}`);_.position.set(c*$t,dt/2,pt/2-Pt/2),_.parent=r;const f=t.rearLeg.createInstance(`bench_${e}_rl${c}`);f.position.set(c*$t,l/2,-pt/2+Pt/2),f.rotation.x=-.1,f.parent=r;const u=t.crossbar.createInstance(`bench_${e}_cb${c}`);u.position.set(c*$t,dt*.35,0),u.parent=r}return r}const gt=4,_t=.12,bn=.4,qt=.28;function Dn(t){const o=ce(t),e=In(t),n=P.CreateCylinder("tpl_lamp_base",{height:.2,diameterTop:_t*1.5,diameterBottom:_t*2.8,tessellation:8},t);n.material=o,n.isVisible=!1;const s=P.CreateCylinder("tpl_lamp_ring",{height:.12,diameterTop:_t*1.3,diameterBottom:_t*1.5,tessellation:8},t);s.material=o,s.isVisible=!1;const i=P.CreateCylinder("tpl_lamp_pole",{height:gt-.8,diameterTop:_t*.75,diameterBottom:_t,tessellation:8},t);i.material=o,i.isVisible=!1;const a=P.CreateCylinder("tpl_lamp_collar",{height:.08,diameterTop:_t*1.6,diameterBottom:_t*1,tessellation:8},t);a.material=o,a.isVisible=!1;const r=P.CreateCylinder("tpl_lamp_lantern",{height:bn,diameterTop:qt*.7,diameterBottom:qt,tessellation:6},t);r.material=e,r.isVisible=!1;const l=P.CreateCylinder("tpl_lamp_roof",{height:.1,diameterTop:.06,diameterBottom:qt*1.1,tessellation:6},t);l.material=o,l.isVisible=!1;const c=P.CreateCylinder("tpl_lamp_spike",{height:.15,diameterTop:0,diameterBottom:.05,tessellation:6},t);return c.material=o,c.isVisible=!1,{base:n,ring:s,pole:i,collar:a,lantern:r,roof:l,spike:c}}function Ln(t,o,e,n,s,i,a){const r=new Zt(`lamp_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.base.createInstance(`lamp_${e}_base`);l.position.y=.1,l.parent=r;const c=t.ring.createInstance(`lamp_${e}_ring`);c.position.y=.26,c.parent=r;const _=t.pole.createInstance(`lamp_${e}_pole`);_.position.y=.32+(gt-.8)/2,_.parent=r;const f=t.collar.createInstance(`lamp_${e}_col`);f.position.y=gt-.44,f.parent=r;const u=t.lantern.createInstance(`lamp_${e}_lan`);u.position.y=gt-.2,u.parent=r;const m=t.roof.createInstance(`lamp_${e}_roof`);m.position.y=gt,m.parent=r;const h=t.spike.createInstance(`lamp_${e}_spike`);return h.position.y=gt+.125,h.parent=r,r}const j=12,ot=5.5,Kt=1.07;function Nn(t){const o=pn(t),e=Tn(t),n=gn(t),s=ce(t),i=P.CreateBox("tpl_tc_surf",{width:ot,height:.02,depth:j},t);i.material=o,i.isVisible=!1;const a=P.CreateBox("tpl_tc_bl",{width:ot+.06,height:.005,depth:.06},t);a.material=e,a.isVisible=!1;const r=P.CreateBox("tpl_tc_sl",{width:.06,height:.005,depth:j},t);r.material=e,r.isVisible=!1;const l=P.CreateBox("tpl_tc_cl",{width:.06,height:.005,depth:j*.54},t);l.material=e,l.isVisible=!1;const c=P.CreateBox("tpl_tc_svl",{width:ot/2+.06,height:.005,depth:.06},t);c.material=e,c.isVisible=!1;const _=P.CreateBox("tpl_tc_net",{width:ot+.5,height:Kt,depth:.03},t);_.material=n,_.isVisible=!1;const f=P.CreateCylinder("tpl_tc_post",{height:Kt+.15,diameter:.06,tessellation:8},t);return f.material=s,f.isVisible=!1,{surface:i,baseline:a,sideline:r,centerLine:l,serviceLine:c,net:_,post:f}}function On(t,o,e,n,s,i,a){const r=new Zt(`tennis_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.surface.createInstance(`tennis_${e}_surf`);l.position.y=.01,l.parent=r;const c=t.baseline.createInstance(`tennis_${e}_bl0`);c.position.set(0,.025,-j/2),c.parent=r;const _=t.baseline.createInstance(`tennis_${e}_bl1`);_.position.set(0,.025,j/2),_.parent=r;const f=t.sideline.createInstance(`tennis_${e}_sl0`);f.position.set(-ot/2,.025,0),f.parent=r;const u=t.sideline.createInstance(`tennis_${e}_sl1`);u.position.set(ot/2,.025,0),u.parent=r;const m=t.centerLine.createInstance(`tennis_${e}_cl`);m.position.set(0,.025,0),m.parent=r;const h=[[-ot/4,j*.365-j/2],[-ot/4,j*.635-j/2],[ot/4,j*.365-j/2],[ot/4,j*.635-j/2]];for(let p=0;p<h.length;p++){const I=t.serviceLine.createInstance(`tennis_${e}_sv${p}`);I.position.set(h[p][0],.025,h[p][1]),I.parent=r}const g=t.net.createInstance(`tennis_${e}_net`);g.position.set(0,Kt/2,0),g.parent=r;for(const p of[-1,1]){const I=t.post.createInstance(`tennis_${e}_np${p}`);I.position.set(p*(ot/2+.25),(Kt+.15)/2,0),I.parent=r}return r}function Va(t,o,e,n,s,i,a=!1){const r=[],l=[],c=[],_=o.length>0?Rn(t):null,f=e.length>0?Dn(t):null,u=n.length>0?Nn(t):null,m=s.length>0?hn(t):null;for(let g=0;g<o.length;g++){const{x:p,z:I,rotation:A}=o[g],d=Sn(_,t,g,p,i(p,I),I,A);l.push(d),r.push({x:p,z:I,radius:.8,scoopable:!0})}for(let g=0;g<e.length;g++){const{x:p,z:I,rotation:A}=e[g],d=Ln(f,t,g,p,i(p,I),I,A);l.push(d);const T=c.length;c.push({root:d,tiltX:0,tiltZ:0,tiltVelX:0,tiltVelZ:0}),r.push({x:p,z:I,radius:.3,elasticIndex:T})}for(let g=0;g<n.length;g++){const{x:p,z:I,rotation:A}=n[g];l.push(On(u,t,g,p,i(p,I),I,A))}const h=[];for(let g=0;g<s.length;g++){const{x:p,z:I,rotation:A}=s[g],d=En(m,t,g,p,i(p,I),I,A,a);l.push(d.root),d.primaryLight&&h.push(d.primaryLight),r.push({x:p,z:I,radius:.6})}return{solidObstacles:r,objectRoots:l,elasticObjects:c,floodlightPrimaryLights:h}}export{Ea as $,Qi as A,js as B,Ui as C,Li as D,As as E,Ds as F,Cs as G,ki as H,Ki as I,Ls as J,Pa as K,Di as L,va as M,Xs as N,qs as O,ns as P,Yt as Q,sa as R,bs as S,Si as T,ti as U,Zi as V,Vi as W,Yi as X,bi as Y,ua as Z,wa as _,Oi as a,xo as a$,fa as a0,ha as a1,da as a2,ra as a3,_a as a4,ca as a5,la as a6,xa as a7,Da as a8,ma as a9,kn as aA,Wn as aB,$n as aC,qn as aD,ts as aE,es as aF,os as aG,jn as aH,Qn as aI,fi as aJ,Ti as aK,di as aL,Ai as aM,Ii as aN,Ri as aO,xi as aP,Bs as aQ,Un as aR,ss as aS,is as aT,Oa as aU,Pn as aV,Io as aW,Bn as aX,Cn as aY,Fn as aZ,Ao as a_,Ta as aa,Ra as ab,ba as ac,Sa as ad,Aa as ae,Ia as af,pa as ag,ga as ah,ei as ai,ni as aj,ri as ak,ii as al,si as am,_i as an,ui as ao,li as ap,ci as aq,oi as ar,ai as as,oa as at,_s as au,Kn as av,Zn as aw,Yn as ax,Jn as ay,Xn as az,Ni as b,Ws as b$,Ro as b0,vn as b1,wn as b2,yn as b3,bo as b4,Do as b5,Lo as b6,Gn as b7,So as b8,No as b9,cs as bA,as as bB,ws as bC,ji as bD,Xi as bE,Zs as bF,ta as bG,ea as bH,mi as bI,Fi as bJ,Ci as bK,Gi as bL,Ei as bM,gi as bN,Ys as bO,Fs as bP,Ks as bQ,Vs as bR,zs as bS,Hs as bT,Gs as bU,pi as bV,Ts as bW,gs as bX,yi as bY,aa as bZ,ia as b_,Oo as ba,Mo as bb,Vn as bc,Hn as bd,zn as be,Ba as bf,Fa as bg,Ga as bh,Ca as bi,Va as bj,Ps as bk,Js as bl,La as bm,ya as bn,Ma as bo,Ua as bp,Ji as bq,Is as br,ms as bs,Es as bt,xs as bu,us as bv,fs as bw,ys as bx,rs as by,ls as bz,Mi as c,ks as c0,hi as c1,Bi as c2,wi as c3,vi as d,Pi as e,na as f,$e as g,zi as h,Wi as i,Hi as j,ds as k,Ss as l,Na as m,Ns as n,Rs as o,ps as p,hs as q,jo as r,Qs as s,$s as t,Us as u,Ms as v,Os as w,vs as x,qi as y,$i as z};
