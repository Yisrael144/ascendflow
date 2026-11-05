// RFC 4180-style parser: quoted commas, escaped quotes and multiline fields.
export function parseCSV(text:string):Record<string,string>[] {
 const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(!value||quoted)quoted=!quoted;else throw Error('Invalid quote in CSV');}else if(c===','&&!quoted){row.push(value);value="";}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))rows.push(row);row=[];value="";}else value+=c;}
 if(quoted)throw Error('Unclosed quoted CSV field');row.push(value);if(row.some(Boolean))rows.push(row);if(!rows.length)return [];
 const headers=rows.shift()!.map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV headers');return rows.map((r,n)=>{if(r.length!==headers.length)throw Error(`Row ${n+2} has ${r.length} fields; expected ${headers.length}`);return Object.fromEntries(headers.map((h,i)=>[h,r[i]]));});
}
