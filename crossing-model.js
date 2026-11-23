/* Bicycle crossing Point layer: one editable attribute, 차로. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BikeCrossingModel=factory();})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const fields=['차로'];
 function validate(data){if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('횡단도로 GeoJSON FeatureCollection 파일을 선택하세요.');const ids=new Set();return {...data,features:data.features.map((f,i)=>{const c=f.geometry?.coordinates,p=f.properties;
  if(f.type!=='Feature'||f.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error((i+1)+'번째 횡단도로는 올바른 EPSG:4326 포인트가 아닙니다.');
  if(!p||!Object.prototype.hasOwnProperty.call(p,'차로'))throw Error('횡단도로 파일에는 차로 속성이 있어야 합니다.');
  const lane=String(p.차로??'').trim();if(lane.length>100)throw Error('차로를 100자 이내로 입력하세요.');const id=String(p.__crossing_id||'crossing-import-'+i);if(ids.has(id))throw Error('횡단도로 식별자가 중복되었습니다.');ids.add(id);
  return {...f,properties:{__crossing_id:id,차로:lane},geometry:{type:'Point',coordinates:c.slice()}};
 })};}
 return {fields,validate};
});
