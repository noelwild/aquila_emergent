import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AlertTriangle, Link as LinkIcon } from 'lucide-react';

export function xmlToHtml(xml) {
  if (!xml) return '';
  return xml
    .replace(/<para>/g, '<p>')
    .replace(/<\/para>/g, '</p>')
    .replace(/<warning>(.*?)<\/warning>/g, '<div class="warning">$1</div>')
    .replace(/<caution>(.*?)<\/caution>/g, '<div class="caution">$1</div>');
}

export function htmlToXml(html) {
  if (!html) return '';
  return html
    .replace(/<div class="warning">(.*?)<\/div>/g, '<warning>$1</warning>')
    .replace(/<div class="caution">(.*?)<\/div>/g, '<caution>$1</caution>')
    .replace(/<p>/g, '<para>')
    .replace(/<\/p>/g, '</para>');
}

const RichTextEditor = ({ content, onChange, readOnly = false }) => {
  const [htmlContent, setHtmlContent] = useState(xmlToHtml(content || ''));
  const quillRef = useRef(null);

  useEffect(() => {
    setHtmlContent(xmlToHtml(content || ''));
  }, [content]);

  const handleChange = (value) => {
    setHtmlContent(value);
    if (onChange) {
      onChange(htmlToXml(value));
    }
  };

  const insertBlock = (cls) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.clipboard.dangerouslyPasteHTML(range.index, `<div class="${cls}">New ${cls}</div>`);
      quill.setSelection(range.index + 1);
    }
  };

  const modules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ 'header': 1 }, { 'header': 2 }],
        ['link'],
        ['clean']
      ],
    },
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 bg-aquila-hover border-b border-aquila-border">
        <button onClick={() => insertBlock('warning')} className="aquila-icon-button p-1" title="Insert Warning">
          <AlertTriangle size={16} className="text-yellow-500" />
        </button>
        <button onClick={() => insertBlock('caution')} className="aquila-icon-button p-1" title="Insert Caution">
          <AlertTriangle size={16} className="text-orange-500" />
        </button>
        <button onClick={() => insertBlock('link')} className="aquila-icon-button p-1" title="Insert Link">
          <LinkIcon size={16} />
        </button>
      </div>
      <ReactQuill
        ref={quillRef}
        value={htmlContent}
        onChange={handleChange}
        readOnly={readOnly}
        modules={modules}
        className="flex-1"
      />
    </div>
  );
};

export default RichTextEditor;
