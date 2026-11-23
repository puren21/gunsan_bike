/* GeoJSON Point validation shared by the rack editor and tests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BikeRackModel=factory();})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const fields=['명칭','주용도','위치','보관대수','주차대수','형식'];
 function count(value,label){if(value===''||value==null)return '';const number=Number(value);if(!Number.isSafeInteger(number)||number<0)throw Error(label+'는 0 이상의 정수로 입력하세요.');return number;}
 function validate(data){
  if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('보관대 GeoJSON FeatureCollection 파일을 선택하세요.');
  const ids=new Set();return {...data,features:data.features.map((feature,i)=>{
   const c=feature.geometry?.coordinates,p={...feature.properties};
   if(feature.type!=='Feature'||feature.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error((i+1)+'번째 보관대가 올바른 EPSG:4326 포인트가 아닙니다.');
   p.명칭=String(p.명칭??'').trim();if(!p.명칭||p.명칭.length>120)throw Error('명칭을 120자 이내로 입력하세요.');
   p.주용도=String(p.주용도??'');if(p.주용도.length>500)throw Error('주용도를 500자 이내로 입력하세요.');
   p.위치=String(p.위치??'');p.형식=String(p.형식??'');if(p.위치.length>500||p.형식.length>100)throw Error('위치는 500자, 형식은 100자 이내로 입력하세요.');
   p.보관대수=count(p.보관대수,'보관대수');p.주차대수=count(p.주차대수,'주차대수');
   p.__rack_id=String(p.__rack_id||'rack-import-'+i);if(ids.has(p.__rack_id))throw Error('보관대 식별자가 중복되었습니다.');ids.add(p.__rack_id);
   return {...feature,properties:p,geometry:{type:'Point',coordinates:c.slice()}};
  })};
 }
 return {fields,count,validate};
});
