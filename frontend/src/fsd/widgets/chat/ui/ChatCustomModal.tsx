'use client';
import type { SyntheticEvent } from 'react';

export function ChatCustomModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="customModal" className="modal-overlay" style={{"display":"none"}}>
        <div className="modal-content">
            <h3 id="modalTitle" style={{"marginTop":"0","color":"#fff"}}>{"Confirm:"}</h3>
            <input type="text" id="modalInput" style={{"display":"none"}} />
            <div className="modal-buttons" style={{"marginTop":"20px","display":"flex","gap":"10px","justifyContent":"flex-end"}}>
                <button id="modalCancel" className="sidebar-btn" style={{"background":"#333","border":"none","color":"white","padding":"8px 15px","borderRadius":"6px","cursor":"pointer"}}>{"Cancel"}</button>
                <button id="modalConfirm" className="sidebar-btn" style={{"background":"#007bff","border":"none","color":"white","padding":"8px 15px","borderRadius":"6px","cursor":"pointer"}}>{"Ok"}</button>
            </div>
        </div>
    </div>); }
