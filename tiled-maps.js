/* Mappe modificate con Tiled Map Editor (formato JSON .tmj).
   build.py incorpora nella build le mappe attive della cartella `mappe/` come `window.TILED_MAPS` (già normalizzate:
   proprietà come oggetti, tileset risolti, livelli di piastrelle come array). Questo modulo le controlla e le traduce
   in modifiche di un'area del mondo: terreno (solo aspetto), edifici, oggetti e decorazioni, collisioni aggiuntive,
   porte e soste. Il modulo che genera la regione applica le modifiche alla propria area senza toccare il resto del
   mondo procedurale. Se una mappa contiene errori non viene applicata: la zona resta quella procedurale. */
(() => {
  'use strict';

  const maps=Array.isArray(window.TILED_MAPS)?window.TILED_MAPS:[];
  const problems=[];
  const SUPPORTED_REGIONS=new Set(['city-velaris']);
  const FLIP=0x0fffffff;                          // Tiled salva i ribaltamenti nei 4 bit alti del gid
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const text=v=>typeof v==='string'?v.trim():'';
  const safeId=v=>/^[a-z][a-z0-9._@,:-]{0,95}$/i.test(v)&&!['constructor','prototype','__proto__'].includes(v);

  /* Piastrelle del terreno: solo aspetto, nessun effetto sulle collisioni. Disegnate con i colori degli Orti
     dell'Alambicco; lo stesso disegno genera l'immagine del tileset per Tiled, così editor e gioco coincidono. */
  const TILE=16;
  const TERRAIN=[
    {tipo:'erba',nome:'Erba'},{tipo:'erba-scura',nome:'Erba scura'},{tipo:'prato-fiorito',nome:'Prato fiorito'},
    {tipo:'strada',nome:'Strada battuta'},{tipo:'bordo-strada',nome:'Bordo della strada'},{tipo:'selciato',nome:'Selciato'},
    {tipo:'aiuola',nome:'Aiuola coltivata'},{tipo:'terra',nome:'Terra smossa'}
  ];
  const terrainIndex=new Map(TERRAIN.map((t,i)=>[t.tipo,i]));
  function fill(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(x,y,w,h);}
  function paintTile(c,type,x,y){
    if(type==='erba'||type==='erba-scura'||type==='prato-fiorito'){
      const dark=type==='erba-scura';
      fill(c,dark?'#54674d':'#5d7455',x,y,TILE,TILE);
      const tones=dark?['#5d7455','#4e6047']:['#6b7d57','#54674d','#72845e'];
      for(let r=0;r<3;r++)for(let k=0;k<2;k++)fill(c,tones[(r+k)%tones.length],x+((r*5+k*8+3)%13),y+2+r*5,2+(r+k)%3,1);
      if(type==='prato-fiorito')for(const [fx,fy,col] of [[3,4,'#c6b97e'],[10,9,'#b6a2a6'],[6,12,'#d7b87d'],[13,3,'#c6b97e']]){
        fill(c,'#5b805e',x+fx,y+fy+1,1,2);fill(c,col,x+fx-1,y+fy,2,1);
      }
      return;
    }
    if(type==='strada'||type==='bordo-strada'){
      const edge=type==='bordo-strada';
      fill(c,edge?'#807957':'#ab9b78',x,y,TILE,TILE);
      for(const [px,py] of [[2,3],[9,1],[13,7],[5,10],[11,13],[1,14]])fill(c,edge?'#ab9b78':(px+py)%2?'#c1b28b':'#958863',x+px,y+py,2,1);
      return;
    }
    if(type==='selciato'){
      fill(c,'#807957',x,y,TILE,TILE);
      for(const [px,py,pw,ph] of [[1,1,6,6],[8,1,7,6],[1,8,7,7],[9,8,6,7]]){fill(c,'#c1b28b',x+px,y+py,pw,ph);fill(c,'#ab9b78',x+px,y+py+ph-1,pw,1);}
      return;
    }
    if(type==='aiuola'){
      fill(c,'#827456',x,y,TILE,TILE);fill(c,'#64563e',x+1,y+1,TILE-2,TILE-2);
      for(let col=2;col<TILE-2;col+=5)for(let row=3;row<TILE-2;row+=6){
        fill(c,'#405e45',x+col,y+row,3,2);fill(c,'#93ad64',x+col+1,y+row-1,2,1);
      }
      return;
    }
    // terra smossa
    fill(c,'#6f5b42',x,y,TILE,TILE);
    for(const [px,py,col] of [[2,2,'#5d4c37'],[9,4,'#86704f'],[5,9,'#5d4c37'],[12,11,'#86704f'],[1,13,'#86704f'],[14,1,'#5d4c37']])fill(c,col,x+px,y+py,2,2);
  }
  /* Ridisegna le piastrelle di una mappa su una tela del terreno. offsetX/offsetY: coordinate del mondo del pixel (0,0)
     della tela; scale: 1 per il terreno, minore per la minimappa (una tinta media per piastrella). */
  const average=['#5f7556','#566849','#6a7c5b','#aa9a77','#857c5b','#a99b76','#6c5e45','#6f5c43'];
  function paintTerrain(canvas,compiled,offsetX=0,offsetY=0,scale=1){
    if(!canvas||!compiled?.terrain)return;
    const g=canvas.getContext('2d'),t=compiled.terrain;
    g.save();g.setTransform(1,0,0,1,0,0);       // la tela del suolo può conservare la trasformazione usata per dipingerla
    for(let j=0;j<t.rows;j++)for(let i=0;i<t.cols;i++){
      const k=t.cells[j*t.cols+i];
      if(k<0)continue;
      const wx=t.x+i*TILE,wy=t.y+j*TILE;
      if(scale===1)paintTile(g,TERRAIN[k].tipo,wx-offsetX,wy-offsetY);
      else fill(g,average[k],(wx-offsetX)*scale,(wy-offsetY)*scale,Math.max(1,TILE*scale),Math.max(1,TILE*scale));
    }
    g.restore();
  }

  /* Oggetti che una mappa può collocare: stessi nomi e stessi raggi di collisione della generazione procedurale. */
  const PROP_TYPES={fruitTree:6,tree:6,lamp:0,prismLamp:0,fountain:9,pond:19,planter:0,crate:0,stall:9,sign:0,banner:0,anvil:7,crystal:0,lensSpire:10};
  const BUILDING_STYLES=['longhouse','herb-loft','cottage','loggia','bellhouse','atelier','gallery','conservatory'];
  const RESIDENT_STYLES=new Set(['bellhouse','cottage','longhouse','gallery']);
  const STYLE_NAMES={loggia:'Loggia',bellhouse:'Torre',atelier:'Vetreria',gallery:'Galleria',longhouse:'Fattoria','herb-loft':'Essiccatoio',cottage:'Casa',conservatory:'Serra'};

  function tileOf(map,gid){
    const raw=(Number(gid)>>>0)&FLIP;
    if(!raw)return null;
    let best=null;
    for(const ts of map.tilesets||[])if(ts.firstgid<=raw&&(!best||ts.firstgid>best.firstgid))best=ts;
    if(!best)return null;
    const local=raw-best.firstgid,tile=best.tiles?.[local]||best.tiles?.[String(local)]||null;
    return {tileset:best.name||'',local,flipped:(Number(gid)>>>0)!==raw,properties:tile?.properties||{},image:tile?.image||null,
      imagewidth:tile?.imagewidth,imageheight:tile?.imageheight};
  }
  const layerName=l=>text(l.name).toLowerCase();

  /* Traduce una mappa normalizzata in modifiche nelle coordinate del mondo. Restituisce {errors,warnings,...}. */
  function compile(map){
    const errors=[],warnings=[],where=map.file||map.name||'mappa';
    const P=map.properties||{};
    const out={file:where,region:text(P.regione),errors,warnings,buildings:[],props:[],solids:[],stops:[],doors:[],terrain:null};
    if(!SUPPORTED_REGIONS.has(out.region))errors.push('Regione non supportata: «'+(P.regione??'')+'». Per ora: city-velaris.');
    if(!finite(P.origineX)||!finite(P.origineY))errors.push('Mancano le proprietà della mappa origineX e origineY (coordinate del mondo dell’angolo in alto a sinistra).');
    if(map.tilewidth!==TILE||map.tileheight!==TILE)errors.push('Le piastrelle devono essere di '+TILE+'×'+TILE+' pixel.');
    if(map.orientation&&map.orientation!=='orthogonal')errors.push('Serve una mappa ortogonale.');
    if(map.infinite)errors.push('La mappa non deve essere «infinita».');
    const ox=Number(P.origineX)||0,oy=Number(P.origineY)||0;
    out.area={x:ox,y:oy,w:(map.width||0)*TILE,h:(map.height||0)*TILE};
    const seen={building:new Set(),prop:new Set(),stop:new Set()};
    const inArea=(x,y)=>x>=out.area.x&&y>=out.area.y&&x<out.area.x+out.area.w&&y<out.area.y+out.area.h;
    for(const layer of map.layers||[]){
      const name=layerName(layer);
      if(layer.type==='imagelayer')continue;            // immagine di riferimento: solo per chi modifica
      if(name==='terreno'&&layer.type==='tilelayer'){
        const data=layer.data||[],cols=layer.width,rows=layer.height,cells=new Int16Array(cols*rows).fill(-1);
        if(data.length!==cols*rows){errors.push('Il livello «terreno» ha '+data.length+' celle invece di '+cols*rows+'.');continue;}
        let unknown=0;
        for(let i=0;i<data.length;i++){
          if(!data[i])continue;
          const tile=tileOf(map,data[i]),k=terrainIndex.get(text(tile?.properties.tipo));
          if(k===undefined){unknown++;continue;}
          cells[i]=k;
        }
        if(unknown)warnings.push(unknown+' piastrelle del terreno non riconosciute sono state ignorate.');
        out.terrain={x:ox+(layer.offsetx||0),y:oy+(layer.offsety||0),cols,rows,cells};
        continue;
      }
      if(layer.type!=='objectgroup'){warnings.push('Livello «'+layer.name+'» ignorato (tipo '+layer.type+').');continue;}
      for(const o of layer.objects||[]){
        const label='«'+(o.name||('oggetto '+o.id))+'» nel livello '+layer.name;
        if(o.rotation)errors.push(label+': la rotazione non è supportata.');
        const op=o.properties||{};
        if(name==='edifici'){
          const tile=o.gid?tileOf(map,o.gid):null;
          if(!tile){errors.push(label+': usa una piastrella del tileset degli edifici.');continue;}
          const tp=tile.properties,pad=Number(tp.pad??14),lift=Number(tp.alzata??55);
          const w=Math.round(o.width-2*pad),h=Math.round(o.height-lift-12);
          const x=Math.round(o.x+ox+pad),y=Math.round(o.y+oy-12-h);
          const style=text(op.stile)||text(tp.stile),id=text(op.id)||null;
          if(!BUILDING_STYLES.includes(style)){errors.push(label+': stile «'+style+'» sconosciuto.');continue;}
          if(w<24||w>220||h<24||h>140){errors.push(label+': dimensioni non valide ('+w+'×'+h+').');continue;}
          if(id&&!safeId(id)){errors.push(label+': id non valido.');continue;}
          if(id&&seen.building.has(id)){errors.push(label+': id «'+id+'» duplicato. Se hai copiato un edificio, cancella la proprietà id della copia.');continue;}
          if(id)seen.building.add(id);
          const color=op.colore===undefined?Number(tp.colore??0):Number(op.colore);
          if(!Number.isInteger(color)||color<0||color>2){errors.push(label+': colore deve essere 0, 1 o 2.');continue;}
          const dx=op.portaDx===undefined?Math.round(w/2):Math.round(Number(op.portaDx)),dy=op.portaDy===undefined?12:Math.round(Number(op.portaDy));
          if(!finite(dx)||!finite(dy)||dx<4||dx>w-4||dy<8||dy>40){errors.push(label+': posizione della porta non valida.');continue;}
          const kind=text(op.tipo)||(RESIDENT_STYLES.has(style)?'residence':'workshop');
          const building={key:id,tiledId:o.id,name:text(o.name)||text(op.nome)||STYLE_NAMES[style],style,kind,color,locked:op.bloccato===true,
            box:{x,y,w,h},door:{x:x+dx,y:y+h+dy}};
          if(!inArea(building.door.x,building.door.y))errors.push(label+': la porta cade fuori dalla mappa.');
          out.buildings.push(building);
        }else if(name==='decorazioni'||name==='oggetti'){
          const tile=o.gid?tileOf(map,o.gid):null;
          if(!tile){errors.push(label+': usa una piastrella del tileset degli oggetti.');continue;}
          const type=text(tile.properties.tipo);
          if(!Object.hasOwn(PROP_TYPES,type)){errors.push(label+': oggetto «'+type+'» sconosciuto.');continue;}
          const ax=Number(tile.properties.ancoraX??32),ay=Number(tile.properties.ancoraY??8);
          const x=Math.round(o.x+ox+ax),y=Math.round(o.y+oy-ay),id=text(op.id)||null;
          if(id&&!safeId(id)){errors.push(label+': id non valido.');continue;}
          if(id&&seen.prop.has(id)){errors.push(label+': id «'+id+'» duplicato. Se hai copiato l’oggetto, cancella la proprietà id della copia.');continue;}
          if(id)seen.prop.add(id);
          if(!inArea(x,y)){errors.push(label+': cade fuori dalla mappa.');continue;}
          out.props.push({key:id,tiledId:o.id,name:type,x,y,label:text(op.etichetta)||text(tile.properties.etichetta)||undefined});
        }else if(name==='collisioni'){
          if(o.gid||o.point){warnings.push(label+': nel livello delle collisioni servono rettangoli o ellissi.');continue;}
          let box={x:o.x+ox,y:o.y+oy,w:o.width,h:o.height};
          const pts=o.polygon||o.polyline;
          if(pts?.length){const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);box={x:o.x+ox+Math.min(...xs),y:o.y+oy+Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
            warnings.push(label+': i poligoni sono trattati come il loro rettangolo esterno.');}
          if(!(box.w>=2&&box.h>=2)){errors.push(label+': collisione troppo piccola.');continue;}
          out.solids.push({x:Math.round(box.x),y:Math.round(box.y),w:Math.round(box.w),h:Math.round(box.h),tiledId:o.id});
        }else if(name==='ingressi'){
          const kind=text(op.tipo),x=Math.round(o.x+ox),y=Math.round(o.y+oy);
          if(kind==='sosta'){
            const id=text(op.id);
            if(!safeId(id)){errors.push(label+': la sosta richiede una proprietà id valida.');continue;}
            if(seen.stop.has(id)){errors.push(label+': sosta «'+id+'» duplicata.');continue;}
            seen.stop.add(id);
            if(!inArea(x,y)){errors.push(label+': cade fuori dalla mappa.');continue;}
            out.stops.push({id,name:text(o.name)||text(op.nome)||id,x,y});
          }else if(kind==='porta'){
            const of=text(op.edificio);
            if(!of){errors.push(label+': la porta richiede la proprietà edificio (id dell’edificio).');continue;}
            out.doors.push({building:of,x,y,locked:op.bloccato===true});
          }else warnings.push(label+': tipo di ingresso «'+kind+'» sconosciuto (usa sosta o porta).');
        }else warnings.push('Livello «'+layer.name+'» ignorato: i livelli riconosciuti sono terreno, decorazioni, edifici, oggetti, collisioni e ingressi.');
      }
    }
    for(const d of out.doors){
      const b=out.buildings.find(q=>q.key===d.building);
      if(!b){errors.push('Porta per «'+d.building+'»: edificio non presente nella mappa.');continue;}
      if(d.x<b.box.x+4||d.x>b.box.x+b.box.w-4||d.y<b.box.y+b.box.h+8||d.y>b.box.y+b.box.h+40)errors.push('Porta di «'+b.name+'»: deve stare davanti alla facciata (sotto l’edificio, entro 40 pixel).');
      else if(!d.locked)b.door={x:d.x,y:d.y};
    }
    return out;
  }

  const compiled=new Map();
  let screened=false;
  /* Modifiche valide per una regione, oppure null. Le mappe non valide restano fuori, con il motivo in TiledMaps.problems. */
  function edits(region){
    if(!screened){
      screened=true;
      for(const m of maps)if(!SUPPORTED_REGIONS.has(text(m.properties?.regione))){
        const errors=['Regione non supportata: «'+(m.properties?.regione??'')+'». Per ora: city-velaris.'];
        problems.push({file:m.file,errors,warnings:[]});
        console.warn('Mappa Tiled non applicata ('+m.file+'):\n- '+errors[0]);
      }
    }
    if(compiled.has(region))return compiled.get(region);
    const mine=maps.filter(m=>text(m.properties?.regione)===region);
    let result=null;
    if(mine.length>1)problems.push({file:mine.map(m=>m.file).join(', '),errors:['Più mappe attive per la stessa regione: tienine attiva una sola.'],warnings:[]});
    else if(mine.length===1){
      const c=compile(mine[0]);
      if(c.errors.length||c.warnings.length)problems.push({file:c.file,errors:c.errors,warnings:c.warnings});
      if(c.errors.length)console.warn('Mappa Tiled non applicata ('+c.file+'):\n- '+c.errors.join('\n- '));
      else result=c;
    }
    compiled.set(region,result);
    return result;
  }
  function reject(region,file,errors){
    problems.push({file,errors,warnings:[]});
    console.warn('Mappa Tiled non applicata ('+file+'):\n- '+errors.join('\n- '));
    compiled.set(region,null);
  }

  /* ---------- verifiche automatiche dell'area modificata (usate dai test e dallo strumento di esportazione) ---------- */
  function verify(ext,area){
    const report={errors:[],warnings:[],doors:0,stops:0,buildings:0};
    const inside=(x,y)=>x>=area.x&&y>=area.y&&x<area.x+area.w&&y<area.y+area.h;
    const here=ext.buildings.filter(b=>inside(b.door.x,b.door.y));
    report.buildings=here.length;
    const target=ext.waypoints.find(w=>w.id==='plaza')||ext.plaza,pairs=new Set();
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    for(const b of here){
      for(const r of [5,6]){
        if(!ext.canWalk(b.door.x,b.door.y,r)){report.errors.push('Porta di «'+b.name+'» non percorribile (raggio '+r+').');continue;}
        if(!ext.path(b.door,target,r).length)report.errors.push('Dalla porta di «'+b.name+'» non si raggiunge la piazza (raggio '+r+').');
      }
      report.doors++;
      for(const o of ext.buildings){
        const k=[b.id,o.id].sort().join('|');
        if(o!==b&&!pairs.has(k)&&overlap(o.box,b.box)){pairs.add(k);report.errors.push('«'+b.name+'» si sovrappone a «'+o.name+'».');}
      }
      for(const o of ext.props||[])if(o.solidBox&&overlap(o.solidBox,b.box))report.warnings.push(o.name+' in '+o.x+','+o.y+' tocca «'+b.name+'».');
    }
    for(const w of ext.waypoints.filter(w=>inside(w.x,w.y))){
      report.stops++;
      if(!ext.path(w,target,5).length)report.errors.push('La sosta «'+(w.name||w.id)+'» non è raggiungibile dalla piazza.');
    }
    const keys=new Map();
    for(const o of ext.props){
      if(!inside(o.x,o.y))continue;
      const k=o.name+'@'+o.x+','+o.y;
      if(keys.has(k))report.errors.push('Oggetto duplicato: '+o.name+' in '+o.x+','+o.y+'.');
      keys.set(k,o);
    }
    return report;
  }

  /* ---------- modello modificabile per Tiled (eseguito nel browser dallo strumento di esportazione) ---------- */
  const prop=(name,type,value)=>({name,type,value});
  function template(ext,{area,file='mappa.tmj',name='Area',attiva=false}){
    const data=ext.exportArea(area),ox=area.x,oy=area.y,cols=Math.ceil(area.w/TILE),rows=Math.ceil(area.h/TILE);
    const images={},png=c=>c.toDataURL('image/png');
    // tileset del terreno: una riga di piastrelle disegnate con paintTile
    const sheet=document.createElement('canvas');sheet.width=TILE*TERRAIN.length;sheet.height=TILE;
    TERRAIN.forEach((t,i)=>paintTile(sheet.getContext('2d'),t.tipo,i*TILE,0));
    images['tileset/terreno-velaris.png']=png(sheet);
    const terrain={columns:TERRAIN.length,image:'terreno-velaris.png',imageheight:TILE,imagewidth:TILE*TERRAIN.length,margin:0,name:'terreno-velaris',
      spacing:0,tilecount:TERRAIN.length,tiledversion:'1.11.0',tileheight:TILE,tilewidth:TILE,type:'tileset',version:'1.10',
      tiles:TERRAIN.map((t,i)=>({id:i,properties:[prop('tipo','string',t.tipo),prop('nome','string',t.nome)]}))};
    // tileset degli oggetti: un'immagine 64×64 per tipo, punto di appoggio a (32, 56)
    const objectTiles=[];
    for(const [i,type] of Object.keys(PROP_TYPES).entries()){
      const label=type==='sign'?'greenhouse':type==='banner'?'market':undefined;
      images['tileset/oggetti/'+type+'.png']=png(data.propImage(type,label));
      objectTiles.push({id:i,image:'oggetti/'+type+'.png',imageheight:64,imagewidth:64,
        properties:[prop('tipo','string',type),prop('ancoraX','int',32),prop('ancoraY','int',8),prop('solido','int',PROP_TYPES[type])].concat(label?[prop('etichetta','string',label)]:[])});
    }
    const objectSet={columns:0,grid:{height:1,orientation:'orthogonal',width:1},margin:0,name:'oggetti-velaris',objectalignment:'bottomleft',spacing:0,
      tilecount:objectTiles.length,tiledversion:'1.11.0',tileheight:64,tilewidth:64,type:'tileset',version:'1.10',tiles:objectTiles};
    // tileset degli edifici: gli edifici esistenti (aspetto esatto) e modelli per nuovi edifici
    const buildingTiles=[],gidOfBuilding=new Map();
    const addBuildingTile=(file,sprite,properties)=>{
      const id=buildingTiles.length;
      images['tileset/edifici/'+file+'.png']=png(sprite.image);
      buildingTiles.push({id,image:'edifici/'+file+'.png',imagewidth:sprite.image.width,imageheight:sprite.image.height,properties});
      return id;
    };
    for(const b of data.buildings){
      const id=addBuildingTile(b.key,b.sprite,[prop('stile','string',b.style),prop('colore','int',b.color),prop('pad','int',14),prop('alzata','int',55),prop('modello','bool',false)]);
      gidOfBuilding.set(b.key,id);
    }
    for(const style of ['longhouse','herb-loft','cottage'])for(const color of [0,1,2]){
      addBuildingTile('modello-'+style+'-'+color,data.modelSprite(style,color,72,52),[prop('stile','string',style),prop('colore','int',color),prop('pad','int',14),prop('alzata','int',55),prop('modello','bool',true)]);
    }
    const buildingSet={columns:0,grid:{height:1,orientation:'orthogonal',width:1},margin:0,name:'edifici-orti',objectalignment:'bottomleft',spacing:0,
      tilecount:buildingTiles.length,tiledversion:'1.11.0',tileheight:Math.max(...buildingTiles.map(t=>t.imageheight)),tilewidth:Math.max(...buildingTiles.map(t=>t.imagewidth)),
      type:'tileset',version:'1.10',tiles:buildingTiles};
    const firstgid={terrain:1,objects:1+terrain.tilecount,buildings:1+terrain.tilecount+objectSet.tilecount};
    let nextObject=1;
    const buildings=data.buildings.map(b=>{
      const s=b.sprite,isVenue=!!b.service;
      return {id:nextObject++,gid:firstgid.buildings+gidOfBuilding.get(b.key),name:b.name,type:'',rotation:0,visible:true,locked:isVenue,
        x:b.box.x-14-ox,y:b.box.y+b.box.h+12-oy,width:s.image.width,height:s.image.height,
        properties:[prop('id','string',b.key),prop('nome','string',b.name),prop('tipo','string',b.kind),prop('colore','int',b.color),
          prop('portaDx','int',b.door.x-b.box.x),prop('portaDy','int',b.door.y-b.box.y-b.box.h)].concat(isVenue?[prop('bloccato','bool',true)]:[])};
    });
    const decorative=new Set(['tree','fruitTree','planter','crystal']);
    const propObject=o=>({id:nextObject++,gid:firstgid.objects+Object.keys(PROP_TYPES).indexOf(o.name),name:o.name,type:'',rotation:0,visible:true,
      x:o.x-32-ox,y:o.y+8-oy,width:64,height:64,properties:[prop('id','string',o.key)].concat(o.label?[prop('etichetta','string',o.label)]:[])});
    const serviceIds=new Set(data.buildings.filter(b=>b.service).map(b=>b.service));
    const stops=data.stops.map(w=>({id:nextObject++,name:w.name||w.id,type:'',point:true,rotation:0,visible:true,locked:serviceIds.has(w.id),x:w.x-ox,y:w.y-oy,width:0,height:0,
      properties:[prop('tipo','string','sosta'),prop('id','string',w.id)].concat(serviceIds.has(w.id)?[prop('bloccato','bool',true)]:[])}));
    images['riferimento/'+file.replace(/\.tmj$/,'')+'-terreno.png']=png(data.ground);
    const layer=(id,name,extra)=>({id,name,opacity:1,visible:true,x:0,y:0,...extra});
    const map={compressionlevel:-1,height:rows,infinite:false,nextlayerid:8,nextobjectid:nextObject,orientation:'orthogonal',renderorder:'right-down',
      tiledversion:'1.11.0',tileheight:TILE,tilewidth:TILE,type:'map',version:'1.10',width:cols,
      properties:[prop('attiva','bool',attiva),prop('regione','string',ext.region.id),prop('origineX','int',ox),prop('origineY','int',oy),
        prop('nome','string',name),prop('versione','int',1)],
      tilesets:[{firstgid:firstgid.terrain,source:'tileset/terreno-velaris.tsj'},{firstgid:firstgid.objects,source:'tileset/oggetti-velaris.tsj'},
        {firstgid:firstgid.buildings,source:'tileset/edifici-orti.tsj'}],
      layers:[
        layer(1,'riferimento (non usato dal gioco)',{type:'imagelayer',image:'riferimento/'+file.replace(/\.tmj$/,'')+'-terreno.png',opacity:.85,locked:true,repeatx:false,repeaty:false}),
        layer(2,'terreno',{type:'tilelayer',width:cols,height:rows,data:new Array(cols*rows).fill(0)}),
        layer(3,'decorazioni',{type:'objectgroup',draworder:'topdown',objects:data.props.filter(o=>decorative.has(o.name)).map(propObject)}),
        layer(4,'edifici',{type:'objectgroup',draworder:'topdown',objects:buildings}),
        layer(5,'oggetti',{type:'objectgroup',draworder:'topdown',objects:data.props.filter(o=>!decorative.has(o.name)).map(propObject)}),
        layer(6,'collisioni',{type:'objectgroup',draworder:'topdown',color:'#ff4040',objects:[]}),
        layer(7,'ingressi',{type:'objectgroup',draworder:'topdown',color:'#40c0ff',objects:stops})
      ]};
    return {map,tilesets:{'tileset/terreno-velaris.tsj':terrain,'tileset/oggetti-velaris.tsj':objectSet,'tileset/edifici-orti.tsj':buildingSet},images};
  }

  window.TiledMaps={maps,problems,edits,reject,compile,verify,template,paintTile,paintTerrain,TILE,TERRAIN,PROP_TYPES,BUILDING_STYLES};
})();
