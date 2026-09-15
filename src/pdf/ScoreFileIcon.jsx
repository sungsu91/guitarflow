export default function ScoreFileIcon({type='score'}){
 return <svg className={`scoreFileIcon scoreFileIcon--${type}`} viewBox="0 0 28 34" aria-hidden="true"><path d="M4 1h13l7 7v24H4z" fill="white" stroke="#89939d"/><path d="M17 1v8h7" fill="#edf0f2" stroke="#89939d"/>{type==='pdf'?<><path d="M1 16h24v11H1z" fill="#b7443c"/><text x="13" y="24" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial" fontWeight="bold">PDF</text></>:<><path d="M8 15h12M8 19h12M8 23h12" stroke="#8b969f"/><path d="M17 14v11c-5 4-8-2-3-3h2v-8z" fill="#496b86"/></>}</svg>;
}
