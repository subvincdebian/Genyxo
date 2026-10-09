'use client';
import type { SyntheticEvent } from 'react';

export function ChatImageEditorModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="imageEditorModal" className="editor-modal" style={{"display":"none"}}>
    <div className="editor-header">
        <button id="editorCloseBtn" className="editor-btn text-btn">
            <i className="fas fa-arrow-left"></i>{" Назад\n        "}</button>
        <div className="editor-actions">
            <button id="editorUndoBtn" className="editor-btn icon-btn" title="Відмінити (Ctrl+Z)">
                <i className="fas fa-undo"></i>
            </button>
            <button id="editorRedoBtn" className="editor-btn icon-btn" title="Повторити (Ctrl+Y)">
                <i className="fas fa-redo"></i>
            </button>
            <button id="editorSaveBtn" className="editor-btn save-btn">
                <i className="fas fa-check"></i>{" Зберегти\n            "}</button>
        </div>
    </div>
    
    <div className="editor-body">
        <div className="canvas-container">
            <canvas id="editorCanvas"></canvas>
        </div>
    </div>
    
    <div className="editor-toolbar">
        <div className="tool-group">
            <button id="toolBrush" className="tool-btn active" title="Малювати пензлем">
                <i className="fas fa-paint-brush"></i>
            </button>
            <button id="toolText" className="tool-btn" title="Додати текст">
                <i className="fas fa-font"></i>
            </button>
        </div>
        
        <div className="color-group">
            <span className="color-picker-wrapper" title="Кастомний колір">
                <input type="color" id="editorColorPicker" defaultValue="#ff0000" />
            </span>
            <button className="color-preset active" data-color="#ff0000" style={{"backgroundColor":"#ff0000"}}></button>
            <button className="color-preset" data-color="#00ff00" style={{"backgroundColor":"#00ff00"}}></button>
            <button className="color-preset" data-color="#0000ff" style={{"backgroundColor":"#0000ff"}}></button>
            <button className="color-preset" data-color="#ffff00" style={{"backgroundColor":"#ffff00"}}></button>
            <button className="color-preset" data-color="#ffffff" style={{"backgroundColor":"#ffffff"}}></button>
            <button className="color-preset" data-color="#000000" style={{"backgroundColor":"#000000"}}></button>
        </div>
        
        <div className="brush-size-group">
            <i className="fas fa-minus small-icon"></i>
            <input type="range" id="brushSize" min="2" max="25" defaultValue="6" />
            <i className="fas fa-plus large-icon"></i>
        </div>
    </div>
</div>); }
