"use client";
import { useState } from "react";
import { EcgWorkspace } from "@/components/ecg/EcgWorkspace";

export function EcgAuthGate({initialAuthenticated,configured}:{initialAuthenticated:boolean;configured:boolean}){
  const [authenticated,setAuthenticated]=useState(initialAuthenticated);const [pin,setPin]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function login(event:React.FormEvent){event.preventDefault();if(!configured||busy)return;setBusy(true);setError("");try{const response=await fetch("/api/auth/pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin}),cache:"no-store"});const data=await response.json() as {ok?:boolean;error?:{message?:string}};if(response.ok&&data.ok){setPin("");setAuthenticated(true)}else setError(data.error?.message??"しばらく待ってから再試行してください。")}catch{setError("しばらく待ってから再試行してください。")}finally{setBusy(false)}}
  async function logout(){if(busy)return;setBusy(true);try{await fetch("/api/auth/logout",{method:"POST",cache:"no-store"})}finally{setAuthenticated(false);setPin("");setBusy(false)}}
  if(authenticated)return <><div className="auth-toolbar"><span>限定公開・認証済み</span><button className="btn secondary" type="button" onClick={logout} disabled={busy}>ログアウト</button></div><EcgWorkspace onAuthRequired={()=>setAuthenticated(false)}/></>;
  return <main className="auth-screen"><section className="card auth-card" aria-labelledby="auth-title"><div className="eyebrow">Limited access</div><h1 id="auth-title">心電図診断支援</h1><p>このアプリは限定公開です。<br/>利用するにはPINコードを入力してください。</p><p className="auth-privacy">患者情報を含む画像はアップロードしないでください。</p>{!configured&&<div className="result warn" role="alert">管理者による認証設定が完了していません。</div>}<form onSubmit={login}><label htmlFor="ecg-pin">PINコード</label><input id="ecg-pin" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="current-password" value={pin} onChange={event=>setPin(event.target.value)} disabled={!configured||busy}/><button className="btn primary-action" type="submit" disabled={!configured||busy||pin.length===0}>{busy?"確認中…":"利用を開始"}</button></form>{error&&<p className="error" role="alert">{error}</p>}</section></main>;
}
