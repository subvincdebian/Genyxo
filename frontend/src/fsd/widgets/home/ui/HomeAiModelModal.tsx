'use client';
import type { SyntheticEvent } from 'react';

export function HomeAiModelModal({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="aiModelModal">
        <div className="modal-content glass" style={{"maxWidth":"500px","textAlign":"left"}}>
            <span className="close-btn" onClick={event => dispatch("home-9", event)}>{"×"}</span>
            
            <div className="ai-modal-header">
                <div className="ai-modal-icon-wrapper">
                    <i id="aiModelIcon" className="fas fa-robot fa-2x" style={{"color":"#10e6cc"}}></i>
                </div>
                <div className="ai-modal-title-group">
                    <h2 id="aiModelTitle">{"Name of the Model"}</h2>
                    <div id="aiModelCompany" className="ai-modal-company">{"Google"}</div>
                </div>
            </div>
            
            <p id="aiModelDesc" className="ai-modal-desc">{"Description of the model will be here..."}</p>
            
            <button id="aiModelSelectBtn" className="submit-btn glow-on-hover" style={{"marginBottom":"20px","width":"100%"}}>{"\n                Use this model\n            "}</button>

            <h3 style={{"fontSize":"1rem","marginBottom":"10px","color":"var(--text-light)"}}>{"Model Comparison"}</h3>
            <div className="ai-comparison-container">
                <table className="ai-comparison-table">
                    <thead>
                        <tr>
                            <th>{"Feature"}</th>
                            <th id="compModel1">{"Gemini"}</th>
                            <th id="compModel2">{"GPT-4"}</th>
                            <th id="compModel3">{"Claude"}</th>
                        </tr>
                    </thead>
                    <tbody id="aiComparisonBody">
                        </tbody>
                </table>
            </div>
        </div>
    </div>); }
