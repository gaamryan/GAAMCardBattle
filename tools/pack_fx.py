#!/usr/bin/env python3
"""
pack_fx.py — pack a PNG frame sequence into a sprite sheet for GAAM Card Battle.

Usage:
  python pack_fx.py "effects/140 Flash Fx .png (color)/4) Flames/Flame 25" myEffect
  python pack_fx.py <sequence_folder> <name> [--tint R,G,B] [--step N] [--px 176] [--fps 24]

Output:
  assets/fx/<name>.png  + a manifest line to paste into config.js `sprites`.

Options:
  --tint R,G,B   recolor by luminance (e.g. --tint 160,225,255 for icy blue)
  --step N       keep every Nth frame (shortens long sequences)
  --px N         max frame dimension in px (default 176)
  --fps N        playback speed to write in the manifest hint (default 24)

Requires: pip install pillow
"""
import sys, os, glob, math, argparse
from PIL import Image

def tint(im, rgb, white_keep=0.55):
    px=im.load(); w,h=im.size
    out=Image.new('RGBA',(w,h)); po=out.load()
    for y in range(h):
        for x in range(w):
            pr,pg,pb,pa=px[x,y]
            if pa==0: po[x,y]=(0,0,0,0); continue
            L=max(pr,pg,pb)/255.0
            wmix=max(0.0,(L-white_keep)/(1-white_keep))
            po[x,y]=(min(255,int(L*rgb[0]*(1-wmix)+255*L*wmix)),
                     min(255,int(L*rgb[1]*(1-wmix)+255*L*wmix)),
                     min(255,int(L*rgb[2]*(1-wmix)+255*L*wmix)),pa)
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("folder"); ap.add_argument("name")
    ap.add_argument("--tint",default=None); ap.add_argument("--step",type=int,default=1)
    ap.add_argument("--px",type=int,default=176); ap.add_argument("--fps",type=int,default=24)
    ap.add_argument("--cols",type=int,default=5)
    a=ap.parse_args()
    fs=sorted(glob.glob(os.path.join(a.folder,'*.png')))[::a.step]
    if not fs: sys.exit("no PNG frames found in "+a.folder)
    frames=[Image.open(f).convert('RGBA') for f in fs]
    bb=None
    for im in frames:
        b=im.getbbox()
        if b: bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    pad=int(0.06*max(bb[2]-bb[0],bb[3]-bb[1]))
    bb=(max(0,bb[0]-pad),max(0,bb[1]-pad),min(frames[0].width,bb[2]+pad),min(frames[0].height,bb[3]+pad))
    cw,ch=bb[2]-bb[0],bb[3]-bb[1]
    scale=a.px/max(cw,ch); fw,fh=int(cw*scale),int(ch*scale)
    rgb=tuple(int(v) for v in a.tint.split(',')) if a.tint else None
    n=len(frames); rows=math.ceil(n/a.cols)
    sheet=Image.new('RGBA',(fw*a.cols,fh*rows),(0,0,0,0))
    for i,im in enumerate(frames):
        crop=im.crop(bb).resize((fw,fh),Image.LANCZOS)
        if rgb: crop=tint(crop,rgb)
        sheet.paste(crop,((i%a.cols)*fw,(i//a.cols)*fh))
    out=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"assets","fx",a.name+".png")
    sheet.save(out,'PNG',optimize=True)
    print("wrote",out)
    print("paste into config.js sprites:")
    print(f'    {a.name}: {{ src: "assets/fx/{a.name}.png", frames: {n}, cols: {a.cols}, fw: {fw}, fh: {fh}, fps: {a.fps} }},')

if __name__=="__main__": main()
