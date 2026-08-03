"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { createProcessedEcgFile, type CropRect } from "@/lib/ecg-image/client-image-processing";

const initialCrop:CropRect={x:.03,y:.03,width:.94,height:.94,rotation:0};
export function EcgImageCropper({file,previewUrl,onCancel,onConfirm}:{file:File;previewUrl:string;onCancel:()=>void;onConfirm:(file:File,crop:CropRect)=>void}){
  const [crop,setCrop]=useState<CropRect>(initialCrop);const [zoom,setZoom]=useState(1);const [error,setError]=useState("");const [saving,setSaving]=useState(false);
  const frame=useRef<HTMLDivElement|null>(null);const drag=useRef<{x:number;y:number;start:CropRect}|null>(null);
  useEffect(()=>{const move=(event:PointerEvent)=>{if(!drag.current||!frame.current)return;const box=frame.current.getBoundingClientRect(),dx=(event.clientX-drag.current.x)/box.width,dy=(event.clientY-drag.current.y)/box.height;setCrop({...drag.current.start,x:clamp(drag.current.start.x+dx,0,1-drag.current.start.width),y:clamp(drag.current.start.y+dy,0,1-drag.current.start.height)})};const up=()=>{drag.current=null};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)}},[]);
  const style=useMemo(()=>({left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.width*100}%`,height:`${crop.height*100}%`}),[crop]);
  const resize=(key:"width"|"height",value:number)=>setCrop(current=>({...current,[key]:Math.min(value,1-(key==="width"?current.x:current.y))}));
  async function confirm(){setSaving(true);setError("");try{onConfirm(await createProcessedEcgFile(file,crop),crop)}catch(e){setError(e instanceof Error?e.message:"切り抜きに失敗しました。")}finally{setSaving(false)}}
  return <div className="cropper" role="dialog" aria-modal="true" aria-labelledby="crop-title"><div className="cropper__head"><div><div className="eyebrow">画像編集</div><h4 id="crop-title">切り抜き範囲</h4></div><p>原則として12誘導すべて、誘導名、波形、校正波形、紙送り速度、感度が残るようにしてください。</p></div>
    <div className="cropper__viewport" ref={frame} style={{transform:`scale(${zoom})`}}><img src={previewUrl} alt="切り抜き対象の心電図画像"/><div className="cropper__selection" style={style} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,start:crop}}} aria-label="切り抜き範囲をドラッグして移動"/></div>
    <div className="cropper__controls"><label>幅<input type="range" min="0.2" max="1" step="0.01" value={crop.width} onChange={e=>resize("width",Number(e.target.value))}/></label><label>高さ<input type="range" min="0.2" max="1" step="0.01" value={crop.height} onChange={e=>resize("height",Number(e.target.value))}/></label><label>拡大<input type="range" min="0.7" max="1.5" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label></div>
    {error&&<div className="error" role="alert">{error}</div>}<div className="upload-actions"><button className="btn" type="button" onClick={()=>setCrop(c=>({...c,rotation:((c.rotation+270)%360) as CropRect["rotation"]}))}>左へ90度回転</button><button className="btn" type="button" onClick={()=>setCrop(c=>({...c,rotation:((c.rotation+90)%360) as CropRect["rotation"]}))}>右へ90度回転</button><button className="btn" type="button" onClick={()=>{setCrop(initialCrop);setZoom(1)}}>リセット</button><button className="btn" type="button" onClick={onCancel}>キャンセル</button><button className="btn primary-action" type="button" disabled={saving} onClick={confirm}>{saving?"処理中…":"この範囲を使用"}</button></div>
  </div>
}
function clamp(value:number,min:number,max:number){return Math.min(Math.max(value,min),max)}
