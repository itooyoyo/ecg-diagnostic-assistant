"use client";

import { useCallback, useEffect, useState } from "react";
import { EcgWorkspace } from "@/components/ecg/EcgWorkspace";

type ConfigurationStatus = "checking" | "configured" | "unconfigured" | "error";
type SessionStatus = {authenticated?:boolean;configured?:boolean};

async function fetchSessionStatus():Promise<SessionStatus>{
  const response=await fetch("/api/auth/session",{cache:"no-store"});
  if(!response.ok)throw new Error("session check failed");
  return response.json() as Promise<SessionStatus>;
}

export function EcgAuthGate({initialAuthenticated,configured}:{initialAuthenticated:boolean;configured:boolean}){
  const [authenticated,setAuthenticated]=useState(initialAuthenticated);
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [configurationStatus,setConfigurationStatus]=useState<ConfigurationStatus>(initialAuthenticated||configured?"configured":"checking");

  const checkConfiguration=useCallback(async()=>{
    try{
      const data=await fetchSessionStatus();
      if(data.authenticated){setAuthenticated(true);setConfigurationStatus("configured");return}
      setConfigurationStatus(data.configured===true?"configured":"unconfigured");
    }catch{
      setConfigurationStatus("error");
      setError("認証設定を確認できませんでした。PIN入力は可能です。必要に応じて再確認してください。");
    }
  },[]);

  useEffect(()=>{
    if(initialAuthenticated)return;
    let active=true;
    void fetchSessionStatus().then(data=>{
      if(!active)return;
      if(data.authenticated){setAuthenticated(true);setConfigurationStatus("configured");return}
      setConfigurationStatus(data.configured===true?"configured":"unconfigured");
    }).catch(()=>{
      if(!active)return;
      setConfigurationStatus("error");
      setError("認証設定を確認できませんでした。PIN入力は可能です。必要に応じて再確認してください。");
    });
    return()=>{active=false};
  },[initialAuthenticated]);

  async function login(event:React.FormEvent){
    event.preventDefault();
    if(configurationStatus==="checking"||configurationStatus==="unconfigured"||busy||pin.length===0)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/auth/pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin}),cache:"no-store"});
      const data=await response.json() as {ok?:boolean;error?:{code?:string;message?:string}};
      if(response.ok&&data.ok){setPin("");setAuthenticated(true);setConfigurationStatus("configured")}
      else{
        if(data.error?.code==="AUTH_NOT_CONFIGURED")setConfigurationStatus("unconfigured");
        setError(data.error?.message??"しばらく待ってから再試行してください。");
      }
    }catch{
      setConfigurationStatus("error");
      setError("しばらく待ってから再試行してください。");
    }finally{setBusy(false)}
  }

  async function logout(){
    if(busy)return;setBusy(true);
    try{await fetch("/api/auth/logout",{method:"POST",cache:"no-store"})}
    finally{setAuthenticated(false);setPin("");setConfigurationStatus("checking");setBusy(false);void checkConfiguration()}
  }

  if(authenticated)return <><div className="auth-toolbar"><span>限定公開・認証済み</span><button className="btn secondary" type="button" onClick={logout} disabled={busy}>ログアウト</button></div><EcgWorkspace onAuthRequired={()=>{setAuthenticated(false);void checkConfiguration()}}/></>;

  const inputDisabled=configurationStatus==="checking"||configurationStatus==="unconfigured"||busy;
  return <main className="auth-screen"><section className="card auth-card" aria-labelledby="auth-title"><div className="eyebrow">Limited access</div><h1 id="auth-title">心電図診断支援</h1><p>このアプリは限定公開です。<br/>利用するにはPINコードを入力してください。</p><p className="auth-privacy">患者情報を含む画像はアップロードしないでください。</p>{configurationStatus==="checking"&&<div className="result" role="status">認証設定を確認しています。</div>}{configurationStatus==="unconfigured"&&<div className="result warn" role="alert">管理者による認証設定が完了していません。</div>}{configurationStatus==="error"&&<div className="result warn" role="alert">認証設定の確認中に通信エラーが発生しました。PIN入力または再確認をお試しください。<button className="btn secondary" type="button" onClick={()=>{setConfigurationStatus("checking");setError("");void checkConfiguration()}}>再試行</button></div>}<form onSubmit={login}><label htmlFor="ecg-pin">PINコード</label><input id="ecg-pin" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="current-password" value={pin} maxLength={12} onChange={event=>setPin(event.target.value.replace(/\D/g,"").slice(0,12))} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();event.currentTarget.form?.requestSubmit()}}} disabled={inputDisabled} autoFocus aria-label="PINコード"/><button className="btn primary-action" type="submit" disabled={inputDisabled||pin.length===0}>{busy?"確認中…":"利用を開始"}</button></form>{error&&<p className="error" role="alert">{error}</p>}</section></main>;
}
