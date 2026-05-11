import{au as no,av as He,v as Le,y as Lt,am as so,C,K as Oe,ae as re,A as ut,D as Jt,X as y,Y as ke,t as K,Z as Wt}from"./BusModel-Cc13TXVt.js";function io(t,o,e=2){const n=o&&o.length,s=n?o[0]*e:t.length;let i=We(t,0,s,e,!0);const a=[];if(!i||i.next===i.prev)return a;let r,l,c;if(n&&(i=uo(t,o,i,e)),t.length>80*e){r=t[0],l=t[1];let u=r,f=l;for(let _=e;_<s;_+=e){const g=t[_],A=t[_+1];g<r&&(r=g),A<l&&(l=A),g>u&&(u=g),A>f&&(f=A)}c=Math.max(u-r,f-l),c=c!==0?32767/c:0}return Vt(i,a,e,r,l,c,0),a}function We(t,o,e,n,s){let i;if(s===Ro(t,o,e,n)>0)for(let a=o;a<e;a+=n)i=ye(a/n|0,t[a],t[a+1],i);else for(let a=e-n;a>=o;a-=n)i=ye(a/n|0,t[a],t[a+1],i);return i&&Nt(i,i.next)&&(kt(i),i=i.next),i}function Tt(t,o){if(!t)return t;o||(o=t);let e=t,n;do if(n=!1,!e.steiner&&(Nt(e,e.next)||F(e.prev,e,e.next)===0)){if(kt(e),e=o=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==o);return o}function Vt(t,o,e,n,s,i,a){if(!t)return;!a&&i&&po(t,n,s,i);let r=t;for(;t.prev!==t.next;){const l=t.prev,c=t.next;if(i?ro(t,n,s,i):ao(t)){o.push(l.i,t.i,c.i),kt(t),t=c.next,r=c.next;continue}if(t=c,t===r){a?a===1?(t=lo(Tt(t),o),Vt(t,o,e,n,s,i,2)):a===2&&co(t,o,e,n,s,i):Vt(Tt(t),o,e,n,s,i,1);break}}}function ao(t){const o=t.prev,e=t,n=t.next;if(F(o,e,n)>=0)return!1;const s=o.x,i=e.x,a=n.x,r=o.y,l=e.y,c=n.y,u=Math.min(s,i,a),f=Math.min(r,l,c),_=Math.max(s,i,a),g=Math.max(r,l,c);let A=n.next;for(;A!==o;){if(A.x>=u&&A.x<=_&&A.y>=f&&A.y<=g&&Gt(s,r,i,l,a,c,A.x,A.y)&&F(A.prev,A,A.next)>=0)return!1;A=A.next}return!0}function ro(t,o,e,n){const s=t.prev,i=t,a=t.next;if(F(s,i,a)>=0)return!1;const r=s.x,l=i.x,c=a.x,u=s.y,f=i.y,_=a.y,g=Math.min(r,l,c),A=Math.min(u,f,_),I=Math.max(r,l,c),R=Math.max(u,f,_),T=le(g,A,o,e,n),E=le(I,R,o,e,n);let h=t.prevZ,d=t.nextZ;for(;h&&h.z>=T&&d&&d.z<=E;){if(h.x>=g&&h.x<=I&&h.y>=A&&h.y<=R&&h!==s&&h!==a&&Gt(r,u,l,f,c,_,h.x,h.y)&&F(h.prev,h,h.next)>=0||(h=h.prevZ,d.x>=g&&d.x<=I&&d.y>=A&&d.y<=R&&d!==s&&d!==a&&Gt(r,u,l,f,c,_,d.x,d.y)&&F(d.prev,d,d.next)>=0))return!1;d=d.nextZ}for(;h&&h.z>=T;){if(h.x>=g&&h.x<=I&&h.y>=A&&h.y<=R&&h!==s&&h!==a&&Gt(r,u,l,f,c,_,h.x,h.y)&&F(h.prev,h,h.next)>=0)return!1;h=h.prevZ}for(;d&&d.z<=E;){if(d.x>=g&&d.x<=I&&d.y>=A&&d.y<=R&&d!==s&&d!==a&&Gt(r,u,l,f,c,_,d.x,d.y)&&F(d.prev,d,d.next)>=0)return!1;d=d.nextZ}return!0}function lo(t,o){let e=t;do{const n=e.prev,s=e.next.next;!Nt(n,s)&&Ye(n,e,e.next,s)&&Ht(n,s)&&Ht(s,n)&&(o.push(n.i,e.i,s.i),kt(e),kt(e.next),e=t=s),e=e.next}while(e!==t);return Tt(e)}function co(t,o,e,n,s,i){let a=t;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&Io(a,r)){let l=Ze(a,r);a=Tt(a,a.next),l=Tt(l,l.next),Vt(a,o,e,n,s,i,0),Vt(l,o,e,n,s,i,0);return}r=r.next}a=a.next}while(a!==t)}function uo(t,o,e,n){const s=[];for(let i=0,a=o.length;i<a;i++){const r=o[i]*n,l=i<a-1?o[i+1]*n:t.length,c=We(t,r,l,n,!1);c===c.next&&(c.steiner=!0),s.push(mo(c))}s.sort(fo);for(let i=0;i<s.length;i++)e=_o(s[i],e);return e}function fo(t,o){let e=t.x-o.x;if(e===0&&(e=t.y-o.y,e===0)){const n=(t.next.y-t.y)/(t.next.x-t.x),s=(o.next.y-o.y)/(o.next.x-o.x);e=n-s}return e}function _o(t,o){const e=Ao(t,o);if(!e)return o;const n=Ze(e,t);return Tt(n,n.next),Tt(e,e.next)}function Ao(t,o){let e=o;const n=t.x,s=t.y;let i=-1/0,a;if(Nt(t,e))return e;do{if(Nt(t,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){const f=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=n&&f>i&&(i=f,a=e.x<e.next.x?e:e.next,f===n))return a}e=e.next}while(e!==o);if(!a)return null;const r=a,l=a.x,c=a.y;let u=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&ze(s<c?n:i,s,l,c,s<c?i:n,s,e.x,e.y)){const f=Math.abs(s-e.y)/(n-e.x);Ht(e,t)&&(f<u||f===u&&(e.x>a.x||e.x===a.x&&ho(a,e)))&&(a=e,u=f)}e=e.next}while(e!==r);return a}function ho(t,o){return F(t.prev,t,o.prev)<0&&F(o.next,t,t.next)<0}function po(t,o,e,n){let s=t;do s.z===0&&(s.z=le(s.x,s.y,o,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==t);s.prevZ.nextZ=null,s.prevZ=null,go(s)}function go(t){let o,e=1;do{let n=t,s;t=null;let i=null;for(o=0;n;){o++;let a=n,r=0;for(let c=0;c<e&&(r++,a=a.nextZ,!!a);c++);let l=e;for(;r>0||l>0&&a;)r!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,r--):(s=a,a=a.nextZ,l--),i?i.nextZ=s:t=s,s.prevZ=i,i=s;n=a}i.nextZ=null,e*=2}while(o>1);return t}function le(t,o,e,n,s){return t=(t-e)*s|0,o=(o-n)*s|0,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,o=(o|o<<8)&16711935,o=(o|o<<4)&252645135,o=(o|o<<2)&858993459,o=(o|o<<1)&1431655765,t|o<<1}function mo(t){let o=t,e=t;do(o.x<e.x||o.x===e.x&&o.y<e.y)&&(e=o),o=o.next;while(o!==t);return e}function ze(t,o,e,n,s,i,a,r){return(s-a)*(o-r)>=(t-a)*(i-r)&&(t-a)*(n-r)>=(e-a)*(o-r)&&(e-a)*(i-r)>=(s-a)*(n-r)}function Gt(t,o,e,n,s,i,a,r){return!(t===a&&o===r)&&ze(t,o,e,n,s,i,a,r)}function Io(t,o){return t.next.i!==o.i&&t.prev.i!==o.i&&!To(t,o)&&(Ht(t,o)&&Ht(o,t)&&Eo(t,o)&&(F(t.prev,t,o.prev)||F(t,o.prev,o))||Nt(t,o)&&F(t.prev,t,t.next)>0&&F(o.prev,o,o.next)>0)}function F(t,o,e){return(o.y-t.y)*(e.x-o.x)-(o.x-t.x)*(e.y-o.y)}function Nt(t,o){return t.x===o.x&&t.y===o.y}function Ye(t,o,e,n){const s=jt(F(t,o,e)),i=jt(F(t,o,n)),a=jt(F(e,n,t)),r=jt(F(e,n,o));return!!(s!==i&&a!==r||s===0&&Xt(t,e,o)||i===0&&Xt(t,n,o)||a===0&&Xt(e,t,n)||r===0&&Xt(e,o,n))}function Xt(t,o,e){return o.x<=Math.max(t.x,e.x)&&o.x>=Math.min(t.x,e.x)&&o.y<=Math.max(t.y,e.y)&&o.y>=Math.min(t.y,e.y)}function jt(t){return t>0?1:t<0?-1:0}function To(t,o){let e=t;do{if(e.i!==t.i&&e.next.i!==t.i&&e.i!==o.i&&e.next.i!==o.i&&Ye(e,e.next,t,o))return!0;e=e.next}while(e!==t);return!1}function Ht(t,o){return F(t.prev,t,t.next)<0?F(t,o,t.next)>=0&&F(t,t.prev,o)>=0:F(t,o,t.prev)<0||F(t,t.next,o)<0}function Eo(t,o){let e=t,n=!1;const s=(t.x+o.x)/2,i=(t.y+o.y)/2;do e.y>i!=e.next.y>i&&e.next.y!==e.y&&s<(e.next.x-e.x)*(i-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==t);return n}function Ze(t,o){const e=ce(t.i,t.x,t.y),n=ce(o.i,o.x,o.y),s=t.next,i=o.prev;return t.next=o,o.prev=t,e.next=s,s.prev=e,n.next=e,e.prev=n,i.next=n,n.prev=i,n}function ye(t,o,e,n){const s=ce(t,o,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function kt(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ)}function ce(t,o,e){return{i:t,x:o,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Ro(t,o,e,n){let s=0;for(let i=o,a=e-n;i<e;i+=n)s+=(t[a]-t[i])*(t[i+1]+t[a+1]),a=i;return s}function kn(t,o){if(t.length===0)return{positions:[],heights:[],totalDistance:0};const e=Math.PI/180,n=6371e3,s=t[0][1],i=t[0][0],a=Math.cos(s*e),r=[];let l=0;for(let u=0;u<t.length;u++){const f=t[u][0],_=t[u][1],g=(f-i)*e*n*a,A=(_-s)*e*n;if(r.push([g,A]),u>0){const I=r[u][0]-r[u-1][0],R=r[u][1]-r[u-1][1];l+=Math.sqrt(I*I+R*R)}}let c;if(o&&o.length===t.length){const u=Math.min(...o);c=o.map(f=>f-u)}else c=new Array(t.length).fill(0);return{positions:r,heights:c,totalDistance:l}}function ee(t,o,e){const n=Math.PI/180,s=6371e3,i=Math.cos(e[1]*n),a=(t-e[0])*n*s*i,r=(o-e[1])*n*s;return[a,r]}function Wn(t){const o=[];let e="dirt",n=0;for(let s=0;s<t.length;s++){const i=t[s][2];typeof i!="string"||i===e||(e!=="dirt"&&o.push({startIndex:n,endIndex:s,type:e}),e=i,n=s)}return e!=="dirt"&&t.length>0&&o.push({startIndex:n,endIndex:t.length-1,type:e}),o}const xo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAAF4AQMAAABHPlzBAAAABlBMVEVMcD00TiPJke3eAAADwUlEQVR4Ae3dIWzbShgH8P+d7dTJ63vNywIyaZusLiDaSEBBpEnTgWoyjKaCwsLCwoGBg4NVNVAYMFDOgTUOxlG4BsbRyDS1u3lnu/eve+v34/q3d7Ivd1+/a9CGAc0cNAvQzEAzxm8VoOFFqznvx1zxos+cEQRz4ozguiFhBD9kBmEs8SttwZLg1urGrXFrJS96wV1g+qdAk4Fm5wQsSQUWZf/0Nqh5mOgCrqsgT0jyHK51mCfsY/0S58jbrTJHLaJHqHUK16pFdIpaL/3RXb0GzZMoo6eIQQqaA9A8tWDZA80AbaSGE83fwPGj42djjNYb2rZQVcGXI1XcmBBtEE6F6zIbcDk1NQ/9nDT1/OpGPTEEzb+g2bnLD8mcF52CJjVg0RYSzbcEi9qAZguaCg2IAWjUGDQb0HwCzSlozlBrnxc9BU2Oh0wVUb47pv/o8xgnThvaxKrKF02bkJkBSyq7So5HoBmBZs/yT4/9R+9HWf/fhUMXtGhl4DPpuP1QFj4jgxZaRQ8srcK6E3/tRYgeKfB8AM06vmghhNBR1l6UibLgbdGLcZTRF6A5As0KNUredYQX9/M8W/BuV8x5T+X0ttFSis+jvO3zCjTP+FUhQMM1LIJEK6DVVZOL5k/I41mT8m7aZelON00KRJnv2dJw6UbR2tdVkBg4VNUkGr5odVwf7eWJ/gaabZTRG8SgiLK15Sto3t2XNqJ9XvQUNLP+owWL5m0LVUFrqNVV8N9/4HwGT4LP8c/o3b+3D0iUUTbEre7yQ9LwogvQ8PsJJJpKWbjkPobwWYImt2DJwIsuwJIYuP4PE23hGvGiUwimIXp7dya8I9eUF53z2oFz/qIz4Z1l/+NF+ybkM2jmsqvkuIyyEew9aFb86BCthXJbr0JD57zot7x7UgdxPuIRnFyEIJWm5R8yCCGEjfKvUusoty9FX1fyCXRJ+zFqTYvG1h1BKJU7AoYt7307QVx94JbX63POu52w5kUXEPJJHn6JM55FurvBG38xquO41KLFEjduN66rFtFT77g0rjlrEZ17K2GJqYv280SrY0Jp8MH1gUsfuPSB55Z2TslAix5Ik1ATKsrozND6vhMbvDSrzY0JSS2tge+fkKVlW/PQl6yp51c3RHfSBz7mFfNyYjSzn1Ki7ykhdkGjo/wXN6oEzZdeDu6HvOiFfE0KhzYxvjuwaKLkRa/BPxyklhad8f7GPSFEe/rAl5a2DxvKrjJal+hE+sAPKdE9fFF8amjR2tK2HwmvFykBjYIQgkrLlRle9Hc+iXVYizXG0gAAAABJRU5ErkJggg==",bo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABDCAMAAABAx6w2AAAABlBMVEXRpnG0iVwaKrObAAAAf0lEQVR42u3ZMQ6DQBAEQfr/n3ZEaOSTMAuiOiRiNb1zJ9hOpQ3YZWjGnjmls0LHGsyndXWaSnEVJxLGUm65uirKv3KsdAt+obKC3p3xN8w14gC4sIv69lzP44hcmxiPv1K2/pVjVXOaRRZI+RF0wz+9+Vw9nEQPWd/SKZgP/QOP+wBJ/lPHwgAAAABJRU5ErkJggg==",So="/game/assets/grass-path-CNsLp6-B.png",No="data:image/png;base64,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",vo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABDCAYAAAB3GVwEAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAUGVYSWZNTQAqAAAACAACARIAAwAAAAEAAQAAh2kABAAAAAEAAAAmAAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAACSoAMABAAAAAEAAABDAAAAADeLsdgAAAIxaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj42NzwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOkNvbG9yU3BhY2U+MTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MTQ2PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CoTBfvsAAANVSURBVHgB7ZkLbuMwDES7ix4iN88Vc4t22YVQRnGsHykNrQkQNLYlevg4ogz3z/1+//rgp4nA4/H4uN1uTXOuPvjv1RP0yI8meqVKI70y4ZkOAjRSBzROeSXQbSR5TpBv5E90/Ujsu40kzwnRnxWS/miGQtTbbaTR1YAEIxlqNKdZ8xH1LjMSIowZRpAFhLSIrHJeZiSrBN7FQS2WLCDERTTK61JG0jCkWPr4neF4/j+BUXNfykg5jPyYpvEjcCkj+WFi5JxA3u1ppJwQj6sI5N2eRqrCxkElAjRSiRCvVxGAN1K+F1dltdmgXkYyr3dujvgzP9F6rIXk+2ZrrKPxHjGP7hP5XC+j3nlHrIaMJCayFHMkkOdiEBja2mii5yLr7vx85fpHQx3p+njqMkwG2nlh0Uh1XjkdtbOBEpihrS0F4V8SoJHoARMCYbe29FwiFLi1mHhhKEhYI13VPFFfqXBrG1qH9pMjLBC9GyQCNFIiwb/VBI7MTiNV4+PAMwJhn5HOkmq9plv10Wprjbfj+CkdSRcKEbKYJ32t9aHk7q1jipF2XuUouXvrmGIk61XOeHgEaCS8moRURCOFLBueaBoJryYhFdFIIcuGJ5pGwqtJSEVdRvJ+JzFC0lubd/yR3FfO7Xqz7f1OYgSItzbv+Ge5axOv1HGksctIR4F4zp8Amnl0xl1bmw7A3yQgBCCMpFs2yxKTwI+RVhcSuWXHLOt81T/PSCzkfPCr76ibh0X9+bC9uqKL7m9hHi0d4hlJC+LvmARopJh1g1NtaiTZd/XeC5ctBbkRMHtGEgNZ77tuWTOwOQGzjkQTPddmt85s1pGeMe55pM2z28Iy60izrSNF04VruX/vvNI9xDzpWxqLfr2VUdiONLLiR+aiG8BKXyujsB3JChjj2BCgkWw4bh9luZFa9+LtKwYKYLmRWvdiUI7by1pupO0r4Agg7/b5seWtwxnJE4YlWIRY0u01L8/uXzSSCNFiVgPyhLE6N4/7z+JVNJIImSXGAyRj+hJITaZoJF8ZGNETDAw1ZRVIelOToZH+1S3BKJewfoQU26vgSa9X/Posf0eG/RfJbwqYv1KxPdXNuEetfnakWlIcd0qARjrFw4u1BNyNhLSP10LhuHYC30MLthhOMi3mAAAAAElFTkSuQmCC",Co=.6,Mo=.3,Lo=.25,Oo=.2,yo=.8,Po=-.5,Do=-1,Uo=.5,zn=.5,Yn=.22,Zn=.22,Jn=.35,Xn=.1,jn=.1,Kn=.16,Qn=.25,wo=-.3,Bo=-1,Go=.6,qn=.2,$n=.2,ts=.32,Fo=.12,Vo=.25,Ho=.06,ko=.06,Wo=.1,zo=1.5,Yo=200,Zo=Math.PI*.8,Jo=.3,Xo=1,jo=.95,Ko=.85,Qo=.1,qo=300,$o=Math.PI*.95,tn=.1,en=.85,on=.82,nn=.7,es=3,os=80,ns=Math.PI*.7,ss=.3,is=1,as=.97,rs=.85,ls=1.5,cs=15,us=Math.PI*.6,fs=1,_s=1,As=.12,ds=.08,hs=5,ps=5e3,gs=2.5,ms=36,Is=12,Ts=20,Es=10,Rs=3,xs=1.12,bs=.4,Ss=30,Ns=2.5,sn=4.5*2,vs=sn+2,Cs=.8,Ms=8,Ls=7,Os=.5,ys=2.6,Ps=3,Ds=2,Us=5.5,ws=.75,Bs=3.5,Gs=.8,Fs=1.3,Vs=8,Hs=.75,ks=10,Ws=.5,zs=.35,Ys=1,Zs=.5,Js=2,Xs=80,js=2.5,Ks=20,Qs=20,qs=.03,$s=.3,ti=14,ei=1,oi=.04,ni=.25,si=3,ii=5,ai=1.5,ri=15,li=15,ci=no[1],ui=He[0],fi=He[1],_i=100,Ai=10,di=250,hi=20,pi=2.4,gi=.35,mi=2.5,Ii=1.2,Ti=.75,Ei=100,Ri=100,xi=1200,bi=90,Si=15,Ni=2,vi=8,Ci=1.5,Mi=.75,Li=30,Oi=2,yi=25,Pi=.5,Di=30,Ui=1,wi=.4,Bi=3e3,Gi=200,Fi=8,Vi=2,Hi=10,ki=6,Wi=.8,zi=.9,Yi=.01,Zi=4,Ji=.4,Xi=.34,ji=6,Ki=.45,Qi=2.5,qi=.12,$i=2.5,ta=1,ea=.45,oa=.34,na=1.22,sa=3,ia=12,aa=1.8,ra=2,la=.6,ca=4,ua=.5,fa=4,_a=.55,Aa=.4,da=8,ha=-.01,pa=1.5,ga=-.02,ma=2,Ia=3,Ta=.03,Ea=8192,ct=16,Ra=500,xa=500,ba=500,Sa=500,an=50,rn=200,ln=1024,cn=2048,un=2048,zt=250,Ot=zt*6,yt=zt*3,Pe=zt*.8,De=zt*.3,fn=`
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
`,_n=`
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
// Path type mask (single resolution, full world): R=gravel, G=pavement, B=grass-path
uniform sampler2D pathTypeMask;

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
uniform sampler2D grassPathTex;
uniform sampler2D gravelTex;
uniform sampler2D pavementTex;

// Solid-color values (replacing tiny 4×4 textures)
uniform vec3 roadColorVal;
uniform vec3 whiteColorVal;
uniform vec3 iceColorVal;
uniform vec3 concreteColorVal;
uniform vec3 sandColorVal;

// Tiling factors
uniform float forestTiling;
uniform float dirtTiling;
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
  vec2 concreteUV = vUV * concreteTiling;

  // Sample diffuse textures
  vec3 forestColor = texture2D(forestTex, forestUV).rgb;
  vec3 dirtColor = texture2D(dirtTex, dirtUV).rgb;
  vec3 roadColor = roadColorVal;
  vec3 whiteColor = whiteColorVal;
  vec3 iceColor = iceColorVal;
  vec3 fieldColor = mix(forestColor, vec3(0.44, 0.68, 0.38), 0.62);
  vec3 sandColor = sandColorVal;
  vec3 concreteColor = concreteColorVal;

  // Sample path type mask (single resolution, R=gravel, G=pavement, B=grass-path)
  vec4 ptMask = texture2D(pathTypeMask, vUV);
  float pathTypeTotal = ptMask.r + ptMask.g + ptMask.b;
  vec3 pathColor = dirtColor;
  if (pathTypeTotal > 0.01) {
    vec3 gravelColor = texture2D(gravelTex, dirtUV).rgb;
    vec3 pavementColor = texture2D(pavementTex, dirtUV).rgb;
    vec3 grassPColor = texture2D(grassPathTex, dirtUV).rgb;
    float invTotal = 1.0 / pathTypeTotal;
    pathColor = gravelColor * (ptMask.r * invTotal)
              + pavementColor * (ptMask.g * invTotal)
              + grassPColor * (ptMask.b * invTotal);
  }

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
  //      Keep non-dirt surfaces fully on their own texture right up to the soft edge.
  //      This avoids a dirt fringe where e.g. grass/gravel fades out.
  vec3 surfaceColor = pathTypeTotal > 0.01 ? pathColor : dirtColor;
  color = mix(color, surfaceColor, mix1.b);
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
`;function Na(t,o){const{pathPositions:e,roads:n=[],trails:s=[],groundSize:i=6e3,pathHalfWidth:a=5,roadHalfWidth:r=a*1.4,edgeSoftness:l=1.5,maskResolution:c=4096,forestTiling:u=600,dirtTiling:f=300,sandTiling:_=600,concreteTiling:g=400,startLine:A,startCircle:I,pathTextureUrl:R,fields:T=[],concrete:E=[],regions:h=[],waterZones:d=[],pathTypeSegments:m=[],pathWidths:P=[]}=o,B=[...T.map(L=>({type:"field",points:L,zIndex:0})),...E.map(L=>({type:"concrete",points:L,zIndex:0})),...h];B.sort((L,N)=>L.zIndex-N.zIndex);const Q=t.getEngine().getCaps().maxTextureSize||4096,H=Math.min(ln,Q),X=Math.min(cn,Q),ft=Math.min(un,Q),J=ne(t,"lo",H,e,n,s,i,a,r,l,A,I,-i/2,-i/2,i,i,B,d,m,P,!0),Y=e.length>0?e[0][0]:0,tt=e.length>0?e[0][1]:0,et=Ot/2,j=yt/2,ot=ne(t,"mid",X,e,n,s,i,a,r,l,A,I,Y-et,tt-et,Ot,Ot,B,d,[],P),W=ne(t,"ultra",ft,e,n,s,i,a,r,l,A,I,Y-j,tt-j,yt,yt,B,d,[],P);let _t=Y,lt=tt,at=Y,ht=tt;const Et=i/2,pt=(L,N,k)=>{const w=(L-k+Et)/i,At=(N-k+Et)/i,V=(L+k+Et)/i,Mt=(N+k+Et)/i;return[w,At,V,Mt]};let nt=pt(Y,tt,et),st=pt(Y,tt,j);const Rt="tiledPathGround";Le.ShadersStore[Rt+"VertexShader"]=fn,Le.ShadersStore[Rt+"FragmentShader"]=_n;const b=new Lt(xo,t);b.anisotropicFilteringLevel=ct;const S=new Lt(R??bo,t);S.anisotropicFilteringLevel=ct;const M=new Lt(So,t);M.anisotropicFilteringLevel=ct;const v=new Lt(No,t);v.anisotropicFilteringLevel=ct;const x=new Lt(vo,t);x.anisotropicFilteringLevel=ct;const p=new so(Rt,t,Rt,{attributes:["position","normal","uv"],uniforms:["worldViewProjection","world","midBounds","ultraBounds","cameraPosition","cameraPosition2","hasSecondCamera","lodNearDist","lodFarDist","forestTiling","dirtTiling","concreteTiling","roadColorVal","whiteColorVal","iceColorVal","concreteColorVal","sandColorVal","sunDirection","sunIntensity","hemiIntensity","hemiGroundColor","chunkDebug","chunkSizeUV","numSpotLights","spotPositions","spotDirections","spotColors","spotIntensities","spotRanges","spotCosAngles","spotExponents","shadowMatrix","hasShadowMap","shadowLightIndex"],samplers:["mixMap1Lo","mixMap1Mid","mixMap1Ultra","mixMap2Lo","mixMap2Mid","mixMap2Ultra","mixMap3Lo","mixMap3Mid","mixMap3Ultra","pathTypeMask","forestTex","dirtTex","grassPathTex","gravelTex","pavementTex","shadowMap"]});p.backFaceCulling=!0,p.setTexture("mixMap1Lo",J.maskTex),p.setTexture("mixMap1Mid",ot.maskTex),p.setTexture("mixMap1Ultra",W.maskTex),p.setTexture("mixMap2Lo",J.lineMaskTex),p.setTexture("mixMap2Mid",ot.lineMaskTex),p.setTexture("mixMap2Ultra",W.lineMaskTex),p.setTexture("mixMap3Lo",J.zoneMaskTex),p.setTexture("mixMap3Mid",ot.zoneMaskTex),p.setTexture("mixMap3Ultra",W.zoneMaskTex),p.setTexture("pathTypeMask",J.pathTypeMaskTex),p.setTexture("forestTex",b),p.setTexture("dirtTex",S),p.setTexture("grassPathTex",M),p.setTexture("gravelTex",v),p.setTexture("pavementTex",x),p.setVector3("roadColorVal",Pt("#606066")),p.setVector3("whiteColorVal",Pt("#ffffff")),p.setVector3("iceColorVal",Pt("#85d2ff")),p.setVector3("concreteColorVal",Pt("#909090")),p.setVector3("sandColorVal",Pt("#d4c49a")),p.setFloat("forestTiling",u),p.setFloat("dirtTiling",f),p.setFloat("concreteTiling",g);const O=(L,N,k,w)=>({x:L,y:N,z:k,w});p.setVector4("midBounds",O(nt[0],nt[1],nt[2],nt[3])),p.setVector4("ultraBounds",O(st[0],st[1],st[2],st[3])),p.setFloat("lodNearDist",an),p.setFloat("lodFarDist",rn),p.setVector3("cameraPosition",{x:0,y:0,z:0}),p.setVector3("cameraPosition2",{x:0,y:0,z:0}),p.setFloat("hasSecondCamera",0);const U=o.isNight??!1,D=U?new C(wo,Bo,Go):new C(Po,Do,Uo),z=Math.sqrt(D.r*D.r+D.g*D.g+D.b*D.b);p.setVector3("sunDirection",{x:D.r/z,y:D.g/z,z:D.b/z}),p.setFloat("sunIntensity",U?Fo:yo),p.setFloat("hemiIntensity",U?Vo:Co),p.setVector3("hemiGroundColor",U?{x:Ho,y:ko,z:Wo}:{x:Mo,y:Lo,z:Oo}),p.setFloat("chunkDebug",0),p.setFloat("chunkSizeUV",zt/i),p.setFloat("hasShadowMap",0),p.setInt("shadowLightIndex",-1),p.setMatrix("shadowMatrix",Oe.Identity());const G=12,Z=new Float32Array(G*3),rt=new Float32Array(G*3),Yt=new Float32Array(G*3),Ct=new ut,ge=new Float32Array(G),me=new Float32Array(G),Ie=new Float32Array(G),Te=new Float32Array(G);p.setInt("numSpotLights",0);let oe=null,Zt=null,Ee=null;const Re=new Oe;p.onBind=()=>{const L=t.lights;let N=0,k=-1;for(let At=0;At<L.length&&N<G;At++){const V=L[At];if(!(V instanceof re)||!V.isEnabled())continue;V===Ee&&(k=N);const Mt=V.getAbsolutePosition(),$=N*3;Z[$]=Mt.x,Z[$+1]=Mt.y,Z[$+2]=Mt.z,V.parent?(ut.TransformNormalToRef(V.direction,V.parent.getWorldMatrix(),Ct),Ct.normalize(),rt[$]=Ct.x,rt[$+1]=Ct.y,rt[$+2]=Ct.z):(rt[$]=V.direction.x,rt[$+1]=V.direction.y,rt[$+2]=V.direction.z),Yt[$]=V.diffuse.r,Yt[$+1]=V.diffuse.g,Yt[$+2]=V.diffuse.b,ge[N]=V.intensity,me[N]=V.range,Ie[N]=Math.cos(V.angle*.5),Te[N]=V.exponent,N++}const w=p.getEffect();w&&(w.setInt("numSpotLights",N),N>0&&(w.setArray3("spotPositions",Array.from(Z.subarray(0,N*3))),w.setArray3("spotDirections",Array.from(rt.subarray(0,N*3))),w.setArray3("spotColors",Array.from(Yt.subarray(0,N*3))),w.setFloatArray("spotIntensities",ge.subarray(0,N)),w.setFloatArray("spotRanges",me.subarray(0,N)),w.setFloatArray("spotCosAngles",Ie.subarray(0,N)),w.setFloatArray("spotExponents",Te.subarray(0,N))),w.setFloat3("cameraPosition",xe,be,Se),w.setFloat3("cameraPosition2",Ne,ve,Ce),w.setFloat("hasSecondCamera",Me),oe&&Zt&&k>=0?(Zt.getViewMatrix().multiplyToRef(Zt.getProjectionMatrix(),Re),w.setMatrix("shadowMatrix",Re),w.setFloat("hasShadowMap",1),w.setInt("shadowLightIndex",k),w.setTexture("shadowMap",oe)):w.setFloat("hasShadowMap",0))};let xe=0,be=0,Se=0;const $e=(L,N,k)=>{xe=L,be=N,Se=k};let Ne=0,ve=0,Ce=0,Me=0;const to=(L,N,k)=>{Ne=L,ve=N,Ce=k,Me=1},eo=L=>{J.setIcePatches(L),ot.setIcePatches(L),W.setIcePatches(L)},oo=(L,N)=>{const k=L-_t,w=N-lt;k*k+w*w>=Pe*Pe&&(_t=L,lt=N,Ue(ot,X,e,n,s,i,a,r,l,A,I,L-et,N-et,Ot,Ot,B,d,m,P),nt=pt(L,N,et),p.setVector4("midBounds",{x:nt[0],y:nt[1],z:nt[2],w:nt[3]}));const At=L-at,V=N-ht;At*At+V*V>=De*De&&(at=L,ht=N,Ue(W,ft,e,n,s,i,a,r,l,A,I,L-j,N-j,yt,yt,B,d,m,P),st=pt(L,N,j),p.setVector4("ultraBounds",{x:st[0],y:st[1],z:st[2],w:st[3]}))};return p.__setIcePatches=eo,p.__updateInsetCenter=oo,p.__setViewCenter=$e,p.__setViewCenter2=to,p.__setShadowMap=(L,N,k)=>{oe=L,Zt=N,Ee=k},p}function ne(t,o,e,n,s,i,a,r,l,c,u,f,_,g,A,I,R=[],T=[],E=[],h=[],d=!1){const m=e,P=new Jt(`pathMask_${o}`,m,t,!1),B=P.getContext(),Q=new Jt(`lineMask_${o}`,m,t,!1),H=Q.getContext(),X=new Jt(`zoneMask_${o}`,m,t,!1),ft=X.getContext();P.anisotropicFilteringLevel=ct,Q.anisotropicFilteringLevel=ct,X.anisotropicFilteringLevel=ct,Je(B,H,ft,m,n,s,i,a,r,l,c,u,f,_,g,A,I,R,T,h);let J;if(d){J=new Jt(`pathTypeMask_${o}`,m,t,!1);const j=J.getContext();J.anisotropicFilteringLevel=ct,dn(j,m,n,r,c,_,g,A,I,E,h,f),J.update()}const Y=document.createElement("canvas");return Y.width=m,Y.height=m,Y.getContext("2d").drawImage(H.canvas,0,0),P.update(),Q.update(),X.update(),{maskTex:P,lineMaskTex:Q,zoneMaskTex:X,pathTypeMaskTex:J,staticLineCanvas:Y,setIcePatches:j=>{H.clearRect(0,0,m,m),H.drawImage(Y,0,0);const ot=he(_,g,A,I,m);for(const W of j){if(W.alpha<=0||W.radius<=0)continue;const[_t,lt]=ot(W.x,W.z),at=W.radius/A*m;if(_t+at<0||_t-at>m||lt+at<0||lt-at>m)continue;const ht=Math.max(0,Math.min(255,Math.round(W.alpha*255)));H.fillStyle=`rgb(0, ${ht}, 0)`,H.beginPath(),H.arc(_t,lt,at,0,Math.PI*2),H.fill()}Q.update()},worldMinX:_,worldMinZ:g,worldW:A,worldH:I}}function Ue(t,o,e,n,s,i,a,r,l,c,u,f,_,g,A,I=[],R=[],T=[],E=[]){const h=o,d=t.maskTex.getContext(),m=t.lineMaskTex.getContext(),P=t.zoneMaskTex.getContext();Je(d,m,P,h,e,n,s,i,a,r,l,c,u,f,_,g,A,I,R,E);const B=t.staticLineCanvas.getContext("2d");B.clearRect(0,0,h,h),B.drawImage(m.canvas,0,0),t.maskTex.update(),t.lineMaskTex.update(),t.zoneMaskTex.update(),t.worldMinX=f,t.worldMinZ=_,t.worldW=g,t.worldH=A}function he(t,o,e,n,s){return(i,a)=>{const r=(i-t)/e*s,l=(o+n-a)/n*s;return[r,l]}}const we=10,Be=.35;function Qt(t,o,e,n,s){if(!(o.length<2)){t.fillStyle=n;for(let i=0;i<o.length;i++){const[a,r]=s(o[i][0],o[i][1]),l=e[i];l<=0||(t.beginPath(),t.arc(a,r,l,0,Math.PI*2),t.fill())}for(let i=0;i<o.length-1;i++){const[a,r]=s(o[i][0],o[i][1]),[l,c]=s(o[i+1][0],o[i+1][1]),u=l-a,f=c-r,_=Math.sqrt(u*u+f*f);if(_<.001)continue;const g=-f/_,A=u/_,I=e[i],R=e[i+1];t.beginPath(),t.moveTo(a+g*I,r+A*I),t.lineTo(l+g*R,c+A*R),t.lineTo(l-g*R,c-A*R),t.lineTo(a-g*I,r-A*I),t.closePath(),t.fill()}}}function An(t,o,e){if(o.length<2)return;if(o.length===2){const[l,c]=e(o[0][0],o[0][1]),[u,f]=e(o[1][0],o[1][1]);t.moveTo(l,c),t.lineTo(u,f);return}const n=[];for(let l=0;l<o.length-1;l++){const c=o[l+1][0]-o[l][0],u=o[l+1][1]-o[l][1];n.push(Math.sqrt(c*c+u*u))}const[s,i]=e(o[0][0],o[0][1]);t.moveTo(s,i);for(let l=1;l<o.length-1;l++){const c=n[l-1],u=n[l],f=Math.min(we,c*Be),_=Math.min(we,u*Be),[g,A]=o[l],[I,R]=o[l-1],[T,E]=o[l+1],h=g-I,d=A-R,m=c>0?1-f/c:1,P=I+h*m,B=R+d*m,Q=T-g,H=E-A,X=u>0?_/u:0,ft=g+Q*X,J=A+H*X,[Y,tt]=e(P,B);t.lineTo(Y,tt);const[et,j]=e(g,A),[ot,W]=e(ft,J);t.quadraticCurveTo(et,j,ot,W)}const[a,r]=e(o[o.length-1][0],o[o.length-1][1]);t.lineTo(a,r)}function Je(t,o,e,n,s,i,a,r,l,c,u,f,_,g,A,I,R,T=[],E=[],h=[]){const d=he(g,A,I,R,n);t.fillStyle="rgb(255, 0, 0)",t.fillRect(0,0,n,n),o.fillStyle="rgb(0, 0, 0)",o.fillRect(0,0,n,n),e.fillStyle="rgb(0, 0, 0)",e.fillRect(0,0,n,n);const m=b=>b/I*n,P=6,B=10,Q=[...T].sort((b,S)=>b.zIndex-S.zIndex);for(const b of Q){const S=b.points;if(!(S.length<3))if(b.type==="concrete"){const M=m(P);e.globalCompositeOperation="source-over",e.beginPath();for(let x=0;x<S.length;x++){const[p,O]=d(S[x][0],S[x][1]);x===0?e.moveTo(p,O):e.lineTo(p,O)}e.closePath(),e.fillStyle="rgb(0, 0, 0)",e.fill(),o.globalCompositeOperation="lighten";const v=(x,p)=>{o.beginPath();for(let O=0;O<S.length;O++){const[U,D]=d(S[O][0],S[O][1]);O===0?o.moveTo(U,D):o.lineTo(U,D)}o.closePath(),p!==void 0?(o.lineWidth=p,o.lineJoin="round",o.strokeStyle=x,o.stroke()):(o.fillStyle=x,o.fill())};v("rgb(0, 0, 160)",M*2),v("rgb(0, 0, 200)",M*1.2),v("rgb(0, 0, 235)",M*.5),v("rgb(0, 0, 255)"),o.globalCompositeOperation="source-over"}else{const M=m(B);o.globalCompositeOperation="source-over",o.beginPath();for(let x=0;x<S.length;x++){const[p,O]=d(S[x][0],S[x][1]);x===0?o.moveTo(p,O):o.lineTo(p,O)}o.closePath(),o.fillStyle="rgb(0, 0, 0)",o.fill(),e.globalCompositeOperation="lighten";const v=(x,p)=>{e.beginPath();for(let O=0;O<S.length;O++){const[U,D]=d(S[O][0],S[O][1]);O===0?e.moveTo(U,D):e.lineTo(U,D)}e.closePath(),p!==void 0?(e.lineWidth=p,e.lineJoin="round",e.strokeStyle=x,e.stroke()):(e.fillStyle=x,e.fill())};v("rgb(160, 0, 0)",M*2),v("rgb(200, 0, 0)",M*1.2),v("rgb(235, 0, 0)",M*.5),v("rgb(255, 0, 0)"),e.globalCompositeOperation="source-over"}}if(E.length>0){const M=m(20),v=m(8);e.globalCompositeOperation="lighten";for(const x of E){if(x.points.length<3)continue;const p=Math.max(0,Math.min(255,Math.round((x.y+100)/200*255))),O=(U,D)=>{const z=`rgb(0, ${D}, ${p})`;e.lineWidth=U,e.lineJoin="round",e.strokeStyle=z,e.beginPath();for(let G=0;G<x.points.length;G++){const[Z,rt]=d(x.points[G][0],x.points[G][1]);G===0?e.moveTo(Z,rt):e.lineTo(Z,rt)}e.closePath(),e.stroke()};O(M*2+v*2,100),O(M*2+v,180),O(M*2,255),e.fillStyle=`rgb(0, 255, ${p})`,e.beginPath();for(let U=0;U<x.points.length;U++){const[D,z]=d(x.points[U][0],x.points[U][1]);U===0?e.moveTo(D,z):e.lineTo(D,z)}e.closePath(),e.fill()}e.globalCompositeOperation="source-over"}if(s.length<2)return;const H=(b,S,M,v=t)=>{b.length<2||(v.lineWidth=S,v.lineCap="round",v.lineJoin="round",v.strokeStyle=M,v.beginPath(),An(v,b,d),v.stroke())},X=(b,S,M,v)=>{t.lineWidth=M,t.lineCap="round",t.lineJoin="round",t.strokeStyle=v,t.beginPath(),t.moveTo(b[0],b[1]),t.lineTo(S[0],S[1]),t.stroke()},ft=c*2+u*1.2,J=m(ft),Y=c*2+u*.4,tt=m(Y),et=c*2,j=m(et);t.globalCompositeOperation="lighten";for(const b of i)H(b,J,"rgb(255, 140, 0)"),H(b,tt,"rgb(255, 210, 0)"),H(b,j,"rgb(255, 255, 0)");t.globalCompositeOperation="source-over";const ot=(l+u)*2,W=m(ot),_t=(l+u*.4)*2,lt=m(_t),at=l*2,ht=m(at),Et=h.length>=s.length&&h.some(b=>b!==1);if(t.globalCompositeOperation="lighten",Et&&s.length>=2){const b=s.map((v,x)=>m(l*(h[x]??1)+u)),S=s.map((v,x)=>m(l*(h[x]??1)+u*.4)),M=s.map((v,x)=>m(l*(h[x]??1)));Qt(t,s,b,"rgb(255, 0, 115)",d),Qt(t,s,S,"rgb(255, 0, 179)",d),Qt(t,s,M,"rgb(255, 0, 255)",d)}else H(s,W,"rgb(255, 0, 115)"),H(s,lt,"rgb(255, 0, 179)"),H(s,ht,"rgb(255, 0, 255)");const pt=l*.4,nt=(pt+u*.4)*2,st=m(nt),Rt=m(pt*2);t.globalCompositeOperation="lighten";for(const b of a)H(b,st,"rgb(255, 0, 60)"),H(b,Rt,"rgb(255, 0, 110)");if(t.globalCompositeOperation="source-over",_&&s.length>0){const b=s[0][0]-_.x,S=s[0][1]-_.z,M=Math.sqrt(b*b+S*S);if(M>.001){const v=b/M,x=S/M,p=d(s[0][0],s[0][1]),O=d(_.x+v*Math.max(0,_.radius-(l+u)),_.z+x*Math.max(0,_.radius-(l+u))),U=d(_.x+v*Math.max(0,_.radius-(l+u*.4)),_.z+x*Math.max(0,_.radius-(l+u*.4))),D=d(_.x+v*Math.max(0,_.radius-l),_.z+x*Math.max(0,_.radius-l));t.globalCompositeOperation="lighten",X(O,p,W,"rgb(255, 0, 115)"),X(U,p,lt,"rgb(255, 0, 179)"),X(D,p,ht,"rgb(255, 0, 255)"),t.globalCompositeOperation="source-over"}}if(_){const[b,S]=d(_.x,_.z),M=m(_.radius);t.globalCompositeOperation="lighten";const v=M+m(u);t.beginPath(),t.arc(b,S,v,0,Math.PI*2),t.fillStyle="rgb(255, 0, 115)",t.fill();const x=M+m(u*.4);t.beginPath(),t.arc(b,S,x,0,Math.PI*2),t.fillStyle="rgb(255, 0, 179)",t.fill(),t.beginPath(),t.arc(b,S,M,0,Math.PI*2),t.fillStyle="rgb(255, 0, 255)",t.fill(),t.globalCompositeOperation="source-over"}if(f){const{x:b,z:S,yaw:M,width:v,thickness:x=.4}=f,p=Math.cos(M),O=-Math.sin(M),U=Math.sin(M),D=Math.cos(M),z=v/2,G=x/2,Z=[d(b-p*z-U*G,S-O*z-D*G),d(b+p*z-U*G,S+O*z-D*G),d(b+p*z+U*G,S+O*z+D*G),d(b-p*z+U*G,S-O*z+D*G)];o.fillStyle="rgb(255, 0, 0)",o.beginPath(),o.moveTo(Z[0][0],Z[0][1]),o.lineTo(Z[1][0],Z[1][1]),o.lineTo(Z[2][0],Z[2][1]),o.lineTo(Z[3][0],Z[3][1]),o.closePath(),o.fill()}}function dn(t,o,e,n,s,i,a,r,l,c,u,f){if(t.fillStyle="rgb(0, 0, 0)",t.fillRect(0,0,o,o),c.length===0||e.length<2)return;const _=he(i,a,r,l,o),g=I=>I/r*o;let A=null;for(const I of c)if(I.startIndex<=0&&I.endIndex>=0){A=I.type;break}for(const I of c){const R=Math.max(0,I.startIndex),T=Math.min(e.length-1,I.endIndex);if(R>=T)continue;let E;switch(I.type){case"gravel":E="rgb(255, 0, 0)";break;case"pavement":E="rgb(0, 255, 0)";break;case"grass":E="rgb(0, 0, 255)";break}t.globalCompositeOperation="lighten";const h=e.slice(R,T+1);if(u.length>=e.length){const d=h.map((m,P)=>{const B=u[R+P]??1;return g(n*B+s)});Qt(t,h,d,E,_)}else{const d=g((n+s)*2);t.lineWidth=d,t.lineCap="round",t.lineJoin="round",t.strokeStyle=E,t.beginPath();for(let m=0;m<h.length;m++){const[P,B]=_(h[m][0],h[m][1]);m===0?t.moveTo(P,B):t.lineTo(P,B)}t.stroke()}t.globalCompositeOperation="source-over"}if(f&&A){let I;switch(A){case"gravel":I="rgb(255, 0, 0)";break;case"pavement":I="rgb(0, 255, 0)";break;case"grass":I="rgb(0, 0, 255)";break}const[R,T]=_(f.x,f.z),E=g(f.radius+s);if(t.globalCompositeOperation="lighten",t.fillStyle=I,t.beginPath(),t.arc(R,T,E,0,Math.PI*2),t.fill(),e.length>0){const h=u.length>0?u[0]??1:1,d=g((n*h+s)*2),[m,P]=_(e[0][0],e[0][1]);t.lineWidth=d,t.lineCap="round",t.strokeStyle=I,t.beginPath(),t.moveTo(R,T),t.lineTo(m,P),t.stroke()}t.globalCompositeOperation="source-over"}}function Pt(t){const o=Number.parseInt(t.slice(1,3),16)/255,e=Number.parseInt(t.slice(3,5),16)/255,n=Number.parseInt(t.slice(5,7),16)/255;return{x:o,y:e,z:n}}function Xe(t,o){const e=new K(o,t);return e.diffuseColor=new C(.1,.4,.75),e.specularColor=new C(.4,.4,.5),e.alpha=.85,e}function hn(t,o,e,n=.02){if(e.length<3)return null;const s=e.map(([i,a])=>new ut(i,0,a));try{const i=y.CreatePolygon(o,{shape:s,sideOrientation:ke.DOUBLESIDE},t,io);return i.position.y=n,i.material=Xe(t,`${o}_mat`),i}catch(i){return console.warn(`[water] Failed to create polygon ${o}:`,i),null}}function pn(t,o,e,n,s=.02){if(e.length<2)return null;const i=[],a=[],r=n/2;for(let l=0;l<e.length;l++){const[c,u]=e[l];let f,_;l===0?(f=e[1][0]-c,_=e[1][1]-u):l===e.length-1?(f=c-e[l-1][0],_=u-e[l-1][1]):(f=e[l+1][0]-e[l-1][0],_=e[l+1][1]-e[l-1][1]);const g=Math.sqrt(f*f+_*_)||1,A=-_/g,I=f/g;i.push(new ut(c+A*r,s,u+I*r)),a.push(new ut(c-A*r,s,u-I*r))}try{const l=y.CreateRibbon(o,{pathArray:[i,a],sideOrientation:ke.DOUBLESIDE},t);return l.material=Xe(t,`${o}_mat`),l}catch(l){return console.warn(`[water] Failed to create ribbon ${o}:`,l),null}}function va(t){return()=>{t|=0,t=t+1831565813|0;let o=Math.imul(t^t>>>15,1|t);return o=o+Math.imul(o^o>>>7,61|o)^o,((o^o>>>14)>>>0)/4294967296}}function gn(t,o,e,n,s){const i=s*s,a=i*s;return .5*(2*o+(-t+e)*s+(2*t-5*o+4*e-n)*i+(-t+3*o-3*e+n)*a)}function Ca(t,o,e,n){if(t.length===0)return[];const s=Math.min(...t.map(i=>i[2]));return t.map(([i,a,r])=>{const[l,c]=ee(a,i,o);return{x:l*e,z:c*e,h:(r-s)*n}})}function Ma(t,o,e,n=12){const s=e.length;if(s===0)return 0;if(s===1)return e[0].h;const i=[];for(let c=0;c<s;c++){const u=t-e[c].x,f=o-e[c].z,_=u*u+f*f;i.push({dist2:_,h:e[c].h})}if(i.sort((c,u)=>c.dist2-u.dist2),i[0].dist2<.001)return i[0].h;const a=Math.min(n,s);let r=0,l=0;for(let c=0;c<a;c++){const u=1/i[c].dist2;r+=u,l+=u*i[c].h}return l/r}function La(t,o,e,n){const s=e.length;if(s===0)return 0;if(s===1)return n[0]??0;let i=Number.POSITIVE_INFINITY,a=0,r=0;for(let _=0;_<s-1;_++){const[g,A]=e[_],[I,R]=e[_+1],T=I-g,E=R-A,h=T*T+E*E;let d=h>0?((t-g)*T+(o-A)*E)/h:0;d=Math.max(0,Math.min(1,d));const m=g+d*T,P=A+d*E,B=(t-m)**2+(o-P)**2;B<i&&(i=B,a=_,r=d)}const l=Math.max(0,a-1),c=a,u=Math.min(s-1,a+1),f=Math.min(s-1,a+2);return gn(n[l],n[c],n[u],n[f],r)}function vt(t,o,e){let n=!1;for(let s=0,i=e.length-1;s<e.length;i=s++){const[a,r]=e[s],[l,c]=e[i];r>o!=c>o&&t<(l-a)*(o-r)/(c-r)+a&&(n=!n)}return n}function mn(t,o,e){let n=Number.POSITIVE_INFINITY;for(let s=0,i=e.length-1;s<e.length;i=s++){const[a,r]=e[i],[l,c]=e[s],u=l-a,f=c-r,_=u*u+f*f;let g=_>0?((t-a)*u+(o-r)*f)/_:0;g=Math.max(0,Math.min(1,g));const A=Math.sqrt((t-(a+g*u))**2+(o-(r+g*f))**2);A<n&&(n=A)}return n}function Oa(t,o,e){let n=Number.POSITIVE_INFINITY;for(let s=0;s<e.length-1;s++){const[i,a]=e[s],[r,l]=e[s+1],c=r-i,u=l-a,f=c*c+u*u;let _=f>0?((t-i)*c+(o-a)*u)/f:0;_=Math.max(0,Math.min(1,_));const g=i+_*c,A=a+_*u,I=Math.sqrt((t-g)**2+(o-A)**2);I<n&&(n=I)}return n}function ya(t,o,e){for(const n of e)if(n.isIsland&&vt(t,o,n.points))return!1;for(const n of e)if(!n.isIsland&&vt(t,o,n.points))return!0;return!1}function Pa(t,o,e){for(const n of e)if(n.isIsland&&vt(t,o,n.points))return null;for(const n of e)if(!n.isIsland&&vt(t,o,n.points))return n.y;return null}function Da(t,o,e,n){for(const i of e)if(i.isIsland&&vt(t,o,i.points))return null;for(const i of e){if(i.isIsland)continue;let a=Number.POSITIVE_INFINITY,r=Number.NEGATIVE_INFINITY,l=Number.POSITIVE_INFINITY,c=Number.NEGATIVE_INFINITY;for(const[g,A]of i.points)g<a&&(a=g),g>r&&(r=g),A<l&&(l=A),A>c&&(c=A);if(t<a-15||t>r+15||o<l-15||o>c+15)continue;const u=vt(t,o,i.points),f=i.y-2;if(u)return f;const _=mn(t,o,i.points);if(_<15){const g=n(t,o)-.08,A=_/15;return g*A+f*(1-A)}}return null}function Ua(t,o,e,n){const s=[];console.log(`[water] Processing ${t.length} water features`);for(const i of t){const a=i.coords.map(([l,c])=>{const[u,f]=ee(l,c,o);return[u*e,f*e]});let r=Number.POSITIVE_INFINITY;for(const[l,c]of a){const u=n(l,c);u<r&&(r=u)}isFinite(r)||(r=0),s.push({points:a,y:r+.1,isIsland:i.type==="island"})}return console.log(`[water] ${s.length} water zones stored`),s}function wa(t,o){for(let e=0;e<o.length;e++){const n=o[e];n.isIsland||(n.points.length>=3?hn(t,`water_${e}`,n.points,n.y):n.points.length>=2&&pn(t,`water_${e}`,n.points,20,n.y))}}function Ba(t,o,e){const n=[];for(const s of t){if(s.length<2)continue;const i=s.map(([a,r])=>{const[l,c]=ee(r,a,o);return[l*e,c*e]});i.length>=2&&n.push(i)}return n}function Ga(t,o,e){const n=[];for(const s of t){if(s.points.length<3)continue;const i=s.points.map(([a,r])=>{const[l,c]=ee(r,a,o);return[l*e,c*e]});i.length>=3&&n.push({type:s.type,height:s.height,points:i})}return n}const ue=25,In=.4,Tn=.18,qt=.5,Ge=1.4,Fe=2,fe=.8,Ve=1.2,En=1.2,Rn=.1;function xn(t){const o=new K("flSteelMat",t);o.diffuseColor=new C(.5,.52,.55),o.specularColor=new C(.15,.15,.15);const e=new K("flDarkMat",t);e.diffuseColor=new C(.12,.12,.14),e.specularColor=new C(.08,.08,.08);const n=new K("flLensMat",t);n.diffuseColor=new C(1,.98,.9),n.emissiveColor=new C(.8,.75,.55),n.specularColor=new C(.3,.3,.2),n.alpha=.9;const s=y.CreateCylinder("tpl_fl_base",{height:qt,diameterTop:Ge*.85,diameterBottom:Ge,tessellation:8},t);s.material=o,s.isVisible=!1;const i=y.CreateCylinder("tpl_fl_mast",{height:ue,diameterTop:Tn,diameterBottom:In,tessellation:8},t);i.material=o,i.isVisible=!1;const a=y.CreateCylinder("tpl_fl_bracket",{height:En,diameter:Rn,tessellation:6},t);a.material=o,a.isVisible=!1;const r=y.CreateBox("tpl_fl_housing",{width:Fe,height:fe,depth:Ve},t);r.material=e,r.isVisible=!1;const l=y.CreateBox("tpl_fl_lens",{width:Fe*.85,height:.08,depth:Ve*.8},t);return l.material=n,l.isVisible=!1,{base:s,mast:i,bracket:a,housing:r,lens:l}}function bn(t,o,e,n,s,i,a,r){const l=new Wt(`floodlight_${e}`,o);l.position.set(n,s,i),l.rotation.y=a;const c=t.base.createInstance(`fl_${e}_base`);c.position.y=qt/2,c.parent=l;const u=t.mast.createInstance(`fl_${e}_mast`);u.position.y=qt+ue/2,u.parent=l;const f=qt+ue,_=t.bracket.createInstance(`fl_${e}_bracket`);_.position.set(0,f-.1,0),_.rotation.x=.3,_.parent=l;const g=f+fe*.5+.1,A=t.housing.createInstance(`fl_${e}_housing`);A.position.set(0,g,0),A.parent=l;const I=t.lens.createInstance(`fl_${e}_lens`);I.position.set(0,g-fe*.5-.04,0),I.parent=l;let R=null;if(r){const T=g-.1,E=new re(`fl_${e}_primary`,new ut(0,T,0),new ut(0,-1,.1),Zo,Jo,o);E.diffuse=new C(Xo,jo,Ko),E.intensity=zo,E.range=Yo,E.parent=l,R=E;const h=new re(`fl_${e}_soft`,new ut(0,T,0),new ut(0,-1,.05),$o,tn,o);h.diffuse=new C(en,on,nn),h.intensity=Qo,h.range=qo,h.parent=l}return{root:l,primaryLight:R}}let Dt=null,Ut=null,wt=null,xt=null,Bt=null,gt=null;function Sn(t){return Dt||(Dt=new K("objWood",t),Dt.diffuseColor=new C(.48,.32,.18),Dt.specularColor=new C(.06,.04,.02)),Dt}function pe(t){return Ut||(Ut=new K("objIron",t),Ut.diffuseColor=new C(.18,.18,.2),Ut.specularColor=new C(.1,.1,.12)),Ut}function Nn(t){return wt||(wt=new K("objWhite",t),wt.diffuseColor=new C(.92,.92,.92),wt.specularColor=new C(.1,.1,.1)),wt}function vn(t){return xt||(xt=new K("objNet",t),xt.diffuseColor=new C(.85,.85,.85),xt.specularColor=C.Black(),xt.alpha=.6),xt}function Cn(t){return Bt||(Bt=new K("objCourt",t),Bt.diffuseColor=new C(.22,.42,.22),Bt.specularColor=C.Black()),Bt}function Mn(t){return gt||(gt=new K("objGlass",t),gt.diffuseColor=new C(.85,.82,.6),gt.emissiveColor=new C(.35,.32,.15),gt.specularColor=new C(.2,.2,.1),gt.alpha=.85),gt}const _e=1.5,St=.4,je=.05,mt=.45,Ke=.4,Ln=.04,se=.06,Ft=.04,Qe=.02,Ae=(St-Qe*2)/3,de=.08,On=.04,ie=_e*.35;function yn(t){const o=Sn(t),e=pe(t),n=y.CreateBox("tpl_bench_seat",{width:_e,height:je,depth:Ae},t);n.material=o,n.isVisible=!1;const s=y.CreateBox("tpl_bench_back",{width:_e,height:de,depth:Ln},t);s.material=o,s.isVisible=!1;const i=y.CreateBox("tpl_bench_fl",{width:se,height:mt,depth:Ft},t);i.material=e,i.isVisible=!1;const a=mt+Ke,r=y.CreateBox("tpl_bench_rl",{width:se,height:a,depth:Ft},t);r.material=e,r.isVisible=!1;const l=y.CreateBox("tpl_bench_cb",{width:se,height:Ft,depth:St*.8},t);return l.material=e,l.isVisible=!1,{seatSlat:n,backSlat:s,frontLeg:i,rearLeg:r,crossbar:l}}function Pn(t,o,e,n,s,i,a){const r=new Wt(`bench_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;for(let c=0;c<3;c++){const u=t.seatSlat.createInstance(`bench_${e}_s${c}`);u.position.set(0,mt,-St/2+Ae/2+c*(Ae+Qe)),u.parent=r}for(let c=0;c<2;c++){const u=t.backSlat.createInstance(`bench_${e}_b${c}`);u.position.set(0,mt+je/2+.06+de/2+c*(de+On),-St/2),u.rotation.x=-.21,u.parent=r}const l=mt+Ke;for(const c of[-1,1]){const u=t.frontLeg.createInstance(`bench_${e}_fl${c}`);u.position.set(c*ie,mt/2,St/2-Ft/2),u.parent=r;const f=t.rearLeg.createInstance(`bench_${e}_rl${c}`);f.position.set(c*ie,l/2,-St/2+Ft/2),f.rotation.x=-.1,f.parent=r;const _=t.crossbar.createInstance(`bench_${e}_cb${c}`);_.position.set(c*ie,mt*.35,0),_.parent=r}return r}const bt=4,dt=.12,Dn=.4,ae=.28;function Un(t){const o=pe(t),e=Mn(t),n=y.CreateCylinder("tpl_lamp_base",{height:.2,diameterTop:dt*1.5,diameterBottom:dt*2.8,tessellation:8},t);n.material=o,n.isVisible=!1;const s=y.CreateCylinder("tpl_lamp_ring",{height:.12,diameterTop:dt*1.3,diameterBottom:dt*1.5,tessellation:8},t);s.material=o,s.isVisible=!1;const i=y.CreateCylinder("tpl_lamp_pole",{height:bt-.8,diameterTop:dt*.75,diameterBottom:dt,tessellation:8},t);i.material=o,i.isVisible=!1;const a=y.CreateCylinder("tpl_lamp_collar",{height:.08,diameterTop:dt*1.6,diameterBottom:dt*1,tessellation:8},t);a.material=o,a.isVisible=!1;const r=y.CreateCylinder("tpl_lamp_lantern",{height:Dn,diameterTop:ae*.7,diameterBottom:ae,tessellation:6},t);r.material=e,r.isVisible=!1;const l=y.CreateCylinder("tpl_lamp_roof",{height:.1,diameterTop:.06,diameterBottom:ae*1.1,tessellation:6},t);l.material=o,l.isVisible=!1;const c=y.CreateCylinder("tpl_lamp_spike",{height:.15,diameterTop:0,diameterBottom:.05,tessellation:6},t);return c.material=o,c.isVisible=!1,{base:n,ring:s,pole:i,collar:a,lantern:r,roof:l,spike:c}}function wn(t,o,e,n,s,i,a){const r=new Wt(`lamp_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.base.createInstance(`lamp_${e}_base`);l.position.y=.1,l.parent=r;const c=t.ring.createInstance(`lamp_${e}_ring`);c.position.y=.26,c.parent=r;const u=t.pole.createInstance(`lamp_${e}_pole`);u.position.y=.32+(bt-.8)/2,u.parent=r;const f=t.collar.createInstance(`lamp_${e}_col`);f.position.y=bt-.44,f.parent=r;const _=t.lantern.createInstance(`lamp_${e}_lan`);_.position.y=bt-.2,_.parent=r;const g=t.roof.createInstance(`lamp_${e}_roof`);g.position.y=bt,g.parent=r;const A=t.spike.createInstance(`lamp_${e}_spike`);return A.position.y=bt+.125,A.parent=r,r}const q=12,it=5.5,$t=1.07;function Bn(t){const o=Cn(t),e=Nn(t),n=vn(t),s=pe(t),i=y.CreateBox("tpl_tc_surf",{width:it,height:.02,depth:q},t);i.material=o,i.isVisible=!1;const a=y.CreateBox("tpl_tc_bl",{width:it+.06,height:.005,depth:.06},t);a.material=e,a.isVisible=!1;const r=y.CreateBox("tpl_tc_sl",{width:.06,height:.005,depth:q},t);r.material=e,r.isVisible=!1;const l=y.CreateBox("tpl_tc_cl",{width:.06,height:.005,depth:q*.54},t);l.material=e,l.isVisible=!1;const c=y.CreateBox("tpl_tc_svl",{width:it/2+.06,height:.005,depth:.06},t);c.material=e,c.isVisible=!1;const u=y.CreateBox("tpl_tc_net",{width:it+.5,height:$t,depth:.03},t);u.material=n,u.isVisible=!1;const f=y.CreateCylinder("tpl_tc_post",{height:$t+.15,diameter:.06,tessellation:8},t);return f.material=s,f.isVisible=!1,{surface:i,baseline:a,sideline:r,centerLine:l,serviceLine:c,net:u,post:f}}function Gn(t,o,e,n,s,i,a){const r=new Wt(`tennis_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.surface.createInstance(`tennis_${e}_surf`);l.position.y=.01,l.parent=r;const c=t.baseline.createInstance(`tennis_${e}_bl0`);c.position.set(0,.025,-q/2),c.parent=r;const u=t.baseline.createInstance(`tennis_${e}_bl1`);u.position.set(0,.025,q/2),u.parent=r;const f=t.sideline.createInstance(`tennis_${e}_sl0`);f.position.set(-it/2,.025,0),f.parent=r;const _=t.sideline.createInstance(`tennis_${e}_sl1`);_.position.set(it/2,.025,0),_.parent=r;const g=t.centerLine.createInstance(`tennis_${e}_cl`);g.position.set(0,.025,0),g.parent=r;const A=[[-it/4,q*.365-q/2],[-it/4,q*.635-q/2],[it/4,q*.365-q/2],[it/4,q*.635-q/2]];for(let R=0;R<A.length;R++){const T=t.serviceLine.createInstance(`tennis_${e}_sv${R}`);T.position.set(A[R][0],.025,A[R][1]),T.parent=r}const I=t.net.createInstance(`tennis_${e}_net`);I.position.set(0,$t/2,0),I.parent=r;for(const R of[-1,1]){const T=t.post.createInstance(`tennis_${e}_np${R}`);T.position.set(R*(it/2+.25),($t+.15)/2,0),T.parent=r}return r}const Kt=1.1,te=1.2,It=2.2,qe=.15;function Fn(t){const o=new K("ptBody",t);o.diffuseColor=new C(.18,.45,.78),o.specularColor=new C(.08,.08,.08);const e=y.CreateBox("tpl_pt_body",{width:Kt,height:It,depth:te},t);e.material=o,e.isVisible=!1;const n=new K("ptRoof",t);n.diffuseColor=new C(.82,.82,.82),n.specularColor=new C(.05,.05,.05);const s=y.CreateBox("tpl_pt_roof",{width:Kt+.04,height:qe,depth:te+.04},t);s.material=n,s.isVisible=!1;const i=new K("ptDoor",t);i.diffuseColor=new C(.14,.36,.65),i.specularColor=new C(.05,.05,.05);const a=y.CreateBox("tpl_pt_door",{width:Kt*.55,height:It*.72,depth:.03},t);a.material=i,a.isVisible=!1;const r=new K("ptSign",t);r.diffuseColor=new C(.95,.95,.95),r.specularColor=C.Black();const l=y.CreateBox("tpl_pt_sign",{width:Kt*.45,height:It*.18,depth:.04},t);return l.material=r,l.isVisible=!1,{body:e,roof:s,door:a,sign:l}}function Vn(t,o,e,n,s,i,a){const r=new Wt(`portaloo_${e}`,o);r.position.set(n,s,i),r.rotation.y=a;const l=t.body.createInstance(`pt_${e}_body`);l.position.y=It/2,l.parent=r;const c=t.roof.createInstance(`pt_${e}_roof`);c.position.y=It+qe/2,c.parent=r;const u=t.door.createInstance(`pt_${e}_door`);u.position.set(0,It*.38,te/2+.015),u.parent=r;const f=t.sign.createInstance(`pt_${e}_sign`);return f.position.set(0,It*.78,te/2+.02),f.parent=r,r}function Fa(t,o,e,n,s,i,a,r=!1){const l=[],c=[],u=[],f=o.length>0?yn(t):null,_=e.length>0?Un(t):null,g=n.length>0?Bn(t):null,A=s.length>0?xn(t):null,I=i.length>0?Fn(t):null;for(let T=0;T<o.length;T++){const{x:E,z:h,rotation:d}=o[T],m=Pn(f,t,T,E,a(E,h),h,d);c.push(m),l.push({x:E,z:h,radius:.8,originalRadius:.8,root:m,scoopable:!0})}for(let T=0;T<e.length;T++){const{x:E,z:h,rotation:d}=e[T],m=wn(_,t,T,E,a(E,h),h,d);c.push(m);const P=u.length;u.push({root:m,tiltX:0,tiltZ:0,tiltVelX:0,tiltVelZ:0}),l.push({x:E,z:h,radius:.3,elasticIndex:P})}for(let T=0;T<n.length;T++){const{x:E,z:h,rotation:d}=n[T];c.push(Gn(g,t,T,E,a(E,h),h,d))}const R=[];for(let T=0;T<s.length;T++){const{x:E,z:h,rotation:d}=s[T],m=bn(A,t,T,E,a(E,h),h,d,r);c.push(m.root),m.primaryLight&&R.push(m.primaryLight),l.push({x:E,z:h,radius:.6})}for(let T=0;T<i.length;T++){const{x:E,z:h,rotation:d}=i[T],m=Vn(I,t,T,E,a(E,h),h,d);c.push(m),l.push({x:E,z:h,radius:.75,originalRadius:.75,root:m,scoopable:!0,scoopSound:"toilet"})}return{solidObstacles:l,objectRoots:c,elasticObjects:u,floodlightPrimaryLights:R}}export{ee as $,ks as A,ci as B,Zi as C,Hi as D,Hs as E,Ys as F,Ks as G,la as H,ua as I,ma as J,ga as K,pa as L,Ps as M,Gs as N,Fs as O,hs as P,Vi as Q,xa as R,Bs as S,Bi as T,Oa as U,Fi as V,ia as W,ya as X,li as Y,ki as Z,_i as _,zi as a,qn as a$,Ai as a0,fa as a1,_a as a2,Gi as a3,di as a4,pi as a5,Ti as a6,mi as a7,gi as a8,xi as a9,wi as aA,Ui as aB,js as aC,kn as aD,ps as aE,gs as aF,Wn as aG,Ca as aH,zn as aI,Co as aJ,Xn as aK,jn as aL,Kn as aM,Mo as aN,Lo as aO,Oo as aP,Yn as aQ,Zn as aR,Jn as aS,Po as aT,Do as aU,Uo as aV,Qn as aW,yo as aX,wo as aY,Bo as aZ,Go as a_,bi as aa,Ei as ab,Ri as ac,hi as ad,Ii as ae,Ea as af,Rs as ag,ns as ah,ss as ai,is as aj,as as ak,rs as al,es as am,os as an,us as ao,fs as ap,_s as aq,As as ar,ds as as,ls as at,cs as au,Si as av,Li as aw,Ni as ax,Di as ay,Pi as az,Wi as b,$n as b0,ts as b1,Ua as b2,Ba as b3,Ga as b4,wa as b5,Fa as b6,zs as b7,ri as b8,Na as b9,ta as bA,Ci as bB,Oi as bC,ai as bD,Qs as bE,si as bF,$s as bG,ei as bH,ti as bI,qs as bJ,yi as bK,Ms as bL,Ls as bM,Ki as bN,Sa as bO,ba as bP,ni as bQ,oi as bR,vi as bS,Qi as bT,ji as bU,Da as ba,Ma as bb,La as bc,vt as bd,Aa as be,ys as bf,Cs as bg,vs as bh,Ds as bi,xs as bj,bs as bk,Xs as bl,Is as bm,Ts as bn,Es as bo,Zs as bp,ha as bq,da as br,ii as bs,ms as bt,Js as bu,Ia as bv,Ta as bw,Mi as bx,$i as by,qi as bz,Yi as c,Xi as d,Ji as e,Ra as f,io as g,ra as h,ca as i,aa as j,Ss as k,Pa as l,va as m,ea as n,oa as o,ws as p,Vs as q,na as r,sa as s,Us as t,Os as u,Ns as v,sn as w,ui as x,fi as y,Ws as z};
