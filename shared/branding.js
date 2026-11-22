export const DEFAULT_BRANDING={accentColor:'#2b1620',backgroundColor:'#f6f0e7',textColor:'#2a1520',logoUrl:null,coverUrl:null,heroTitle:''};
export function contrast(a,b){
 const luminance=c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;};
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
export function brandStyle(store={}){
 const get=key=>/^#[a-f0-9]{6}$/i.test(store[key])?store[key]:DEFAULT_BRANDING[key];
 const accent=get('accentColor'),bg=get('backgroundColor'),ink=get('textColor');
 const mix=(a,b,ratio)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-ratio)+parseInt(b.slice(i,i+2),16)*ratio).toString(16).padStart(2,'0')).join('');
 return {'--brand-accent':accent,'--brand-on-accent':contrast(accent,'#ffffff')>=contrast(accent,'#000000')?'#ffffff':'#000000','--brand-bg':bg,'--brand-ink':ink,'--brand-muted':mix(bg,ink,.75),'--brand-surface':mix(bg,ink,.04),'--brand-line':mix(bg,ink,.22)};
}
