/* Distribution build of the UNAI app: strips ALL comments (the architecture notes that make
 * the code easy to paste-and-explain) and minifies, WITHOUT renaming globals — so the browser
 * app and Node server keep working. Reliable deterrent; stronger obfuscation needs the runtime
 * moved server-side (see notes). */
const fs=require("fs"), path=require("path");
const {minify}=require("terser");
const SRC=process.argv[2], DST=process.argv[3];
const TOPT={ compress:{ defaults:true, drop_console:false }, mangle:false, format:{ comments:false } };
function stripComments(c){ return c.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:"'`])\/\/[^\n]*$/gm,"$1"); }
async function strip(js){ try{ const r=await minify(js,TOPT); return r.code||stripComments(js); }catch(e){ console.error("  ! terser failed, comment-strip fallback:",e.message); return stripComments(js); } }
function ensure(d){ fs.mkdirSync(d,{recursive:true}); }
const SKIP=n=>n==="node_modules"||n==="env.sh"||n.endsWith(".zip")||n==="systems_of_record.db"||n.startsWith("~$")||n===".bqconfig.json";
async function walk(dir,base){ base=base||dir;
  for(const name of fs.readdirSync(dir)){
    if(SKIP(name)) continue;
    const p=path.join(dir,name), rel=path.relative(base,p), out=path.join(DST,rel);
    if(fs.statSync(p).isDirectory()){ ensure(out); await walk(p,base); continue; }
    ensure(path.dirname(out));
    if(name.endsWith(".js")){ fs.writeFileSync(out, await strip(fs.readFileSync(p,"utf8"))); console.log("  strip",rel); }
    else if(name.endsWith(".html")){
      const parts=fs.readFileSync(p,"utf8").split(/(<script>[\s\S]*?<\/script>)/g);
      for(let i=0;i<parts.length;i++){ const m=parts[i].match(/^<script>([\s\S]*?)<\/script>$/);
        if(m && m[1].trim()) parts[i]="<script>"+(await strip(m[1]))+"</script>"; }
      // also drop HTML comments
      fs.writeFileSync(out, parts.join("").replace(/<!--[\s\S]*?-->/g,"")); console.log("  strip-inline",rel);
    } else fs.copyFileSync(p,out);
  }
}
(async()=>{
  if(fs.existsSync(DST)) fs.rmSync(DST,{recursive:true,force:true});
  ensure(DST); await walk(SRC);
  fs.writeFileSync(path.join(DST,"DIST_README.txt"),
"UNAI - distribution build. All source comments removed and code minified (global names preserved so it runs).\nRun: node server.js (default port 3000).\nNote: this removes the descriptive architecture comments; it is a deterrent, not encryption. The strongest\nprotection is to run the runtime (engine/cognition) server-side and expose only APIs. Proprietary & Confidential - Bristlecone.\n");
  console.log("DONE ->",DST);
})();
