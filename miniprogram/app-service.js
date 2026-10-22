}	var __wxAppData = __wxAppData || {}; 	var __wxRoute = __wxRoute || ""; 	var __wxRouteBegin = __wxRouteBegin || ""; 	var __wxAppCode__ = __wxAppCode__ || {};	var global = global || {};	var __WXML_GLOBAL__=__WXML_GLOBAL__ || {};	var __wxAppCurrentFile__=__wxAppCurrentFile__||""; 	var Component = Component || function(){};	var definePlugin = definePlugin || function(){};	var requirePlugin = requirePlugin || function(){};	var Behavior = Behavior || function(){};	var __vd_version_info__ = __vd_version_info__ || {};
	/*v0.5vv_20200413_syb_scopedata*/global.__wcc_version__='v0.5vv_20200413_syb_scopedata';global.__wcc_version_info__={"customComponents":true,"fixZeroRpx":true,"propValueDeepCopy":false};
var $gwxc
var $gaic={}
$gwx=function(path,global){
if(typeof global === 'undefined') global={};if(typeof __WXML_GLOBAL__ === 'undefined') {__WXML_GLOBAL__={};
}__WXML_GLOBAL__.modules = __WXML_GLOBAL__.modules || {};
function _(a,b){if(typeof(b)!='undefined')a.children.push(b);}
function _v(k){if(typeof(k)!='undefined')return {tag:'virtual','wxKey':k,children:[]};return {tag:'virtual',children:[]};}
function _n(tag){$gwxc++;if($gwxc>=16000){throw 'Dom limit exceeded, please check if there\'s any mistake you\'ve made.'};return {tag:'wx-'+tag,attr:{},children:[],n:[],raw:{},generics:{}}}
function _p(a,b){b&&a.properities.push(b);}
function _s(scope,env,key){return typeof(scope[key])!='undefined'?scope[key]:env[key]}
function _wp(m){console.warn("WXMLRT_$gwx:"+m)}
function _wl(tname,prefix){_wp(prefix+':-1:-1:-1: Template `' + tname + '` is being called recursively, will be stop.')}
$gwn=console.warn;
$gwl=console.log;
function $gwh()
{
function x()
{
}
x.prototype = 
{
hn: function( obj, all )
{
if( typeof(obj) == 'object' )
{
var cnt=0;
var any1=false,any2=false;
for(var x in obj)
{
any1=any1|x==='__value__';
any2=any2|x==='__wxspec__';
cnt++;
if(cnt>2)break;
}
return cnt == 2 && any1 && any2 && ( all || obj.__wxspec__ !== 'm' || this.hn(obj.__value__) === 'h' ) ? "h" : "n";
}
return "n";
},
nh: function( obj, special )
{
return { __value__: obj, __wxspec__: special ? special : true }
},
rv: function( obj )
{
return this.hn(obj,true)==='n'?obj:this.rv(obj.__value__);
},
hm: function( obj )
{
if( typeof(obj) == 'object' )
{
var cnt=0;
var any1=false,any2=false;
for(var x in obj)
{
any1=any1|x==='__value__';
any2=any2|x==='__wxspec__';
cnt++;
if(cnt>2)break;
}
return cnt == 2 && any1 && any2 && (obj.__wxspec__ === 'm' || this.hm(obj.__value__) );
}
return false;
}
}
return new x;
}
wh=$gwh();
function $gstack(s){
var tmp=s.split('\n '+' '+' '+' ');
for(var i=0;i<tmp.length;++i){
if(0==i) continue;
if(")"===tmp[i][tmp[i].length-1])
tmp[i]=tmp[i].replace(/\s\(.*\)$/,"");
else
tmp[i]="at anonymous function";
}
return tmp.join('\n '+' '+' '+' ');
}
function $gwrt( should_pass_type_info )
{
function ArithmeticEv( ops, e, s, g, o )
{
var _f = false;
var rop = ops[0][1];
var _a,_b,_c,_d, _aa, _bb;
switch( rop )
{
case '?:':
_a = rev( ops[1], e, s, g, o, _f );
_c = should_pass_type_info && ( wh.hn(_a) === 'h' );
_d = wh.rv( _a ) ? rev( ops[2], e, s, g, o, _f ) : rev( ops[3], e, s, g, o, _f );
_d = _c && wh.hn( _d ) === 'n' ? wh.nh( _d, 'c' ) : _d;
return _d;
break;
case '&&':
_a = rev( ops[1], e, s, g, o, _f );
_c = should_pass_type_info && ( wh.hn(_a) === 'h' );
_d = wh.rv( _a ) ? rev( ops[2], e, s, g, o, _f ) : wh.rv( _a );
_d = _c && wh.hn( _d ) === 'n' ? wh.nh( _d, 'c' ) : _d;
return _d;
break;
case '||':
_a = rev( ops[1], e, s, g, o, _f );
_c = should_pass_type_info && ( wh.hn(_a) === 'h' );
_d = wh.rv( _a ) ? wh.rv(_a) : rev( ops[2], e, s, g, o, _f );
_d = _c && wh.hn( _d ) === 'n' ? wh.nh( _d, 'c' ) : _d;
return _d;
break;
case '+':
case '*':
case '/':
case '%':
case '|':
case '^':
case '&':
case '===':
case '==':
case '!=':
case '!==':
case '>=':
case '<=':
case '>':
case '<':
case '<<':
case '>>':
_a = rev( ops[1], e, s, g, o, _f );
_b = rev( ops[2], e, s, g, o, _f );
_c = should_pass_type_info && (wh.hn( _a ) === 'h' || wh.hn( _b ) === 'h');
switch( rop )
{
case '+':
_d = wh.rv( _a ) + wh.rv( _b );
break;
case '*':
_d = wh.rv( _a ) * wh.rv( _b );
break;
case '/':
_d = wh.rv( _a ) / wh.rv( _b );
break;
case '%':
_d = wh.rv( _a ) % wh.rv( _b );
break;
case '|':
_d = wh.rv( _a ) | wh.rv( _b );
break;
case '^':
_d = wh.rv( _a ) ^ wh.rv( _b );
break;
case '&':
_d = wh.rv( _a ) & wh.rv( _b );
break;
case '===':
_d = wh.rv( _a ) === wh.rv( _b );
break;
case '==':
_d = wh.rv( _a ) == wh.rv( _b );
break;
case '!=':
_d = wh.rv( _a ) != wh.rv( _b );
break;
case '!==':
_d = wh.rv( _a ) !== wh.rv( _b );
break;
case '>=':
_d = wh.rv( _a ) >= wh.rv( _b );
break;
case '<=':
_d = wh.rv( _a ) <= wh.rv( _b );
break;
case '>':
_d = wh.rv( _a ) > wh.rv( _b );
break;
case '<':
_d = wh.rv( _a ) < wh.rv( _b );
break;
case '<<':
_d = wh.rv( _a ) << wh.rv( _b );
break;
case '>>':
_d = wh.rv( _a ) >> wh.rv( _b );
break;
default:
break;
}
return _c ? wh.nh( _d, "c" ) : _d;
break;
case '-':
_a = ops.length === 3 ? rev( ops[1], e, s, g, o, _f ) : 0;
_b = ops.length === 3 ? rev( ops[2], e, s, g, o, _f ) : rev( ops[1], e, s, g, o, _f );
_c = should_pass_type_info && (wh.hn( _a ) === 'h' || wh.hn( _b ) === 'h');
_d = _c ? wh.rv( _a ) - wh.rv( _b ) : _a - _b;
return _c ? wh.nh( _d, "c" ) : _d;
break;
case '!':
_a = rev( ops[1], e, s, g, o, _f );
_c = should_pass_type_info && (wh.hn( _a ) == 'h');
_d = !wh.rv(_a);
return _c ? wh.nh( _d, "c" ) : _d;
case '~':
_a = rev( ops[1], e, s, g, o, _f );
_c = should_pass_type_info && (wh.hn( _a ) == 'h');
_d = ~wh.rv(_a);
return _c ? wh.nh( _d, "c" ) : _d;
default:
$gwn('unrecognized op' + rop );
}
}
function rev( ops, e, s, g, o, newap )
{
var op = ops[0];
var _f = false;
if ( typeof newap !== "undefined" ) o.ap = newap;
if( typeof(op)==='object' )
{
var vop=op[0];
var _a, _aa, _b, _bb, _c, _d, _s, _e, _ta, _tb, _td;
switch(vop)
{
case 2:
return ArithmeticEv(ops,e,s,g,o);
break;
case 4: 
return rev( ops[1], e, s, g, o, _f );
break;
case 5: 
switch( ops.length )
{
case 2: 
_a = rev( ops[1],e,s,g,o,_f );
return should_pass_type_info?[_a]:[wh.rv(_a)];
return [_a];
break;
case 1: 
return [];
break;
default:
_a = rev( ops[1],e,s,g,o,_f );
_b = rev( ops[2],e,s,g,o,_f );
_a.push( 
should_pass_type_info ?
_b :
wh.rv( _b )
);
return _a;
break;
}
break;
case 6:
_a = rev(ops[1],e,s,g,o);
var ap = o.ap;
_ta = wh.hn(_a)==='h';
_aa = _ta ? wh.rv(_a) : _a;
o.is_affected |= _ta;
if( should_pass_type_info )
{
if( _aa===null || typeof(_aa) === 'undefined' )
{
return _ta ? wh.nh(undefined, 'e') : undefined;
}
_b = rev(ops[2],e,s,g,o,_f);
_tb = wh.hn(_b) === 'h';
_bb = _tb ? wh.rv(_b) : _b;
o.ap = ap;
o.is_affected |= _tb;
if( _bb===null || typeof(_bb) === 'undefined' || 
_bb === "__proto__" || _bb === "prototype" || _bb === "caller" ) 
{
return (_ta || _tb) ? wh.nh(undefined, 'e') : undefined;
}
_d = _aa[_bb];
if ( typeof _d === 'function' && !ap ) _d = undefined;
_td = wh.hn(_d)==='h';
o.is_affected |= _td;
return (_ta || _tb) ? (_td ? _d : wh.nh(_d, 'e')) : _d;
}
else
{
if( _aa===null || typeof(_aa) === 'undefined' )
{
return undefined;
}
_b = rev(ops[2],e,s,g,o,_f);
_tb = wh.hn(_b) === 'h';
_bb = _tb ? wh.rv(_b) : _b;
o.ap = ap;
o.is_affected |= _tb;
if( _bb===null || typeof(_bb) === 'undefined' || 
_bb === "__proto__" || _bb === "prototype" || _bb === "caller" ) 
{
return undefined;
}
_d = _aa[_bb];
if ( typeof _d === 'function' && !ap ) _d = undefined;
_td = wh.hn(_d)==='h';
o.is_affected |= _td;
return _td ? wh.rv(_d) : _d;
}
case 7: 
switch(ops[1][0])
{
case 11:
o.is_affected |= wh.hn(g)==='h';
return g;
case 3:
_s = wh.rv( s );
_e = wh.rv( e );
_b = ops[1][1];
if (g && g.f && g.f.hasOwnProperty(_b) )
{
_a = g.f;
o.ap = true;
}
else
{
_a = _s && _s.hasOwnProperty(_b) ? 
s : (_e && _e.hasOwnProperty(_b) ? e : undefined );
}
if( should_pass_type_info )
{
if( _a )
{
_ta = wh.hn(_a) === 'h';
_aa = _ta ? wh.rv( _a ) : _a;
_d = _aa[_b];
_td = wh.hn(_d) === 'h';
o.is_affected |= _ta || _td;
_d = _ta && !_td ? wh.nh(_d,'e') : _d;
return _d;
}
}
else
{
if( _a )
{
_ta = wh.hn(_a) === 'h';
_aa = _ta ? wh.rv( _a ) : _a;
_d = _aa[_b];
_td = wh.hn(_d) === 'h';
o.is_affected |= _ta || _td;
return wh.rv(_d);
}
}
return undefined;
}
break;
case 8: 
_a = {};
_a[ops[1]] = rev(ops[2],e,s,g,o,_f);
return _a;
break;
case 9: 
_a = rev(ops[1],e,s,g,o,_f);
_b = rev(ops[2],e,s,g,o,_f);
function merge( _a, _b, _ow )
{
var ka, _bbk;
_ta = wh.hn(_a)==='h';
_tb = wh.hn(_b)==='h';
_aa = wh.rv(_a);
_bb = wh.rv(_b);
for(var k in _bb)
{
if ( _ow || !_aa.hasOwnProperty(k) )
{
_aa[k] = should_pass_type_info ? (_tb ? wh.nh(_bb[k],'e') : _bb[k]) : wh.rv(_bb[k]);
}
}
return _a;
}
var _c = _a
var _ow = true
if ( typeof(ops[1][0]) === "object" && ops[1][0][0] === 10 ) {
_a = _b
_b = _c
_ow = false
}
if ( typeof(ops[1][0]) === "object" && ops[1][0][0] === 10 ) {
var _r = {}
return merge( merge( _r, _a, _ow ), _b, _ow );
}
else
return merge( _a, _b, _ow );
break;
case 10:
_a = rev(ops[1],e,s,g,o,_f);
_a = should_pass_type_info ? _a : wh.rv( _a );
return _a ;
break;
case 12:
var _r;
_a = rev(ops[1],e,s,g,o);
if ( !o.ap )
{
return should_pass_type_info && wh.hn(_a)==='h' ? wh.nh( _r, 'f' ) : _r;
}
var ap = o.ap;
_b = rev(ops[2],e,s,g,o,_f);
o.ap = ap;
_ta = wh.hn(_a)==='h';
_tb = _ca(_b);
_aa = wh.rv(_a);	
_bb = wh.rv(_b); snap_bb=$gdc(_bb,"nv_");
try{
_r = typeof _aa === "function" ? $gdc(_aa.apply(null, snap_bb)) : undefined;
} catch (e){
e.message = e.message.replace(/nv_/g,"");
e.stack = e.stack.substring(0,e.stack.indexOf("\n", e.stack.lastIndexOf("at nv_")));
e.stack = e.stack.replace(/\snv_/g," "); 
e.stack = $gstack(e.stack);	
if(g.debugInfo)
{
e.stack += "\n "+" "+" "+" at "+g.debugInfo[0]+":"+g.debugInfo[1]+":"+g.debugInfo[2];
console.error(e);
}
_r = undefined;
}
return should_pass_type_info && (_tb || _ta) ? wh.nh( _r, 'f' ) : _r;
}
}
else
{
if( op === 3 || op === 1) return ops[1];
else if( op === 11 ) 
{
var _a='';
for( var i = 1 ; i < ops.length ; i++ )
{
var xp = wh.rv(rev(ops[i],e,s,g,o,_f));
_a += typeof(xp) === 'undefined' ? '' : xp;
}
return _a;
}
}
}
function wrapper( ops, e, s, g, o, newap )
{
if( ops[0] == '11182016' )
{
g.debugInfo = ops[2];
return rev( ops[1], e, s, g, o, newap );
}
else
{
g.debugInfo = null;
return rev( ops, e, s, g, o, newap );
}
}
return wrapper;
}
gra=$gwrt(true); 
grb=$gwrt(false); 
function TestTest( expr, ops, e,s,g, expect_a, expect_b, expect_affected )
{
{
var o = {is_affected:false};
var a = gra( ops, e,s,g, o );
if( JSON.stringify(a) != JSON.stringify( expect_a )
|| o.is_affected != expect_affected )
{
console.warn( "A. " + expr + " get result " + JSON.stringify(a) + ", " + o.is_affected + ", but " + JSON.stringify( expect_a ) + ", " + expect_affected + " is expected" );
}
}
{
var o = {is_affected:false};
var a = grb( ops, e,s,g, o );
if( JSON.stringify(a) != JSON.stringify( expect_b )
|| o.is_affected != expect_affected )
{
console.warn( "B. " + expr + " get result " + JSON.stringify(a) + ", " + o.is_affected + ", but " + JSON.stringify( expect_b ) + ", " + expect_affected + " is expected" );
}
}
}

function wfor( to_iter, func, env, _s, global, father, itemname, indexname, keyname )
{
var _n = wh.hn( to_iter ) === 'n'; 
var scope = wh.rv( _s ); 
var has_old_item = scope.hasOwnProperty(itemname);
var has_old_index = scope.hasOwnProperty(indexname);
var old_item = scope[itemname];
var old_index = scope[indexname];
var full = Object.prototype.toString.call(wh.rv(to_iter));
var type = full[8]; 
if( type === 'N' && full[10] === 'l' ) type = 'X'; 
var _y;
if( _n )
{
if( type === 'A' ) 
{
var r_iter_item;
for( var i = 0 ; i < to_iter.length ; i++ )
{
scope[itemname] = to_iter[i];
scope[indexname] = _n ? i : wh.nh(i, 'h');
r_iter_item = wh.rv(to_iter[i]);
var key = keyname && r_iter_item ? (keyname==="*this" ? r_iter_item : wh.rv(r_iter_item[keyname])) : undefined;
_y = _v(key);
_(father,_y);
func( env, scope, _y, global );
}
}
else if( type === 'O' ) 
{
var i = 0;
var r_iter_item;
for( var k in to_iter )
{
scope[itemname] = to_iter[k];
scope[indexname] = _n ? k : wh.nh(k, 'h');
r_iter_item = wh.rv(to_iter[k]);
var key = keyname && r_iter_item ? (keyname==="*this" ? r_iter_item : wh.rv(r_iter_item[keyname])) : undefined;
_y = _v(key);
_(father,_y);
func( env,scope,_y,global );
i++;
}
}
else if( type === 'S' ) 
{
for( var i = 0 ; i < to_iter.length ; i++ )
{
scope[itemname] = to_iter[i];
scope[indexname] = _n ? i : wh.nh(i, 'h');
_y = _v( to_iter[i] + i );
_(father,_y);
func( env,scope,_y,global );
}
}
else if( type === 'N' ) 
{
for( var i = 0 ; i < to_iter ; i++ )
{
scope[itemname] = i;
scope[indexname] = _n ? i : wh.nh(i, 'h');
_y = _v( i );
_(father,_y);
func(env,scope,_y,global);
}
}
else
{
}
}
else
{
var r_to_iter = wh.rv(to_iter);
var r_iter_item, iter_item;
if( type === 'A' ) 
{
for( var i = 0 ; i < r_to_iter.length ; i++ )
{
iter_item = r_to_iter[i];
iter_item = wh.hn(iter_item)==='n' ? wh.nh(iter_item,'h') : iter_item;
r_iter_item = wh.rv( iter_item );
scope[itemname] = iter_item
scope[indexname] = _n ? i : wh.nh(i, 'h');
var key = keyname && r_iter_item ? (keyname==="*this" ? r_iter_item : wh.rv(r_iter_item[keyname])) : undefined;
_y = _v(key);
_(father,_y);
func( env, scope, _y, global );
}
}
else if( type === 'O' ) 
{
var i=0;
for( var k in r_to_iter )
{
iter_item = r_to_iter[k];
iter_item = wh.hn(iter_item)==='n'? wh.nh(iter_item,'h') : iter_item;
r_iter_item = wh.rv( iter_item );
scope[itemname] = iter_item;
scope[indexname] = _n ? k : wh.nh(k, 'h');
var key = keyname && r_iter_item ? (keyname==="*this" ? r_iter_item : wh.rv(r_iter_item[keyname])) : undefined;
_y=_v(key);
_(father,_y);
func( env, scope, _y, global );
i++
}
}
else if( type === 'S' ) 
{
for( var i = 0 ; i < r_to_iter.length ; i++ )
{
iter_item = wh.nh(r_to_iter[i],'h');
scope[itemname] = iter_item;
scope[indexname] = _n ? i : wh.nh(i, 'h');
_y = _v( to_iter[i] + i );
_(father,_y);
func( env, scope, _y, global );
}
}
else if( type === 'N' ) 
{
for( var i = 0 ; i < r_to_iter ; i++ )
{
iter_item = wh.nh(i,'h');
scope[itemname] = iter_item;
scope[indexname]= _n ? i : wh.nh(i,'h');
_y = _v( i );
_(father,_y);
func(env,scope,_y,global);
}
}
else
{
}
}
if(has_old_item)
{
scope[itemname]=old_item;
}
else
{
delete scope[itemname];
}
if(has_old_index)
{
scope[indexname]=old_index;
}
else
{
delete scope[indexname];
}
}

function _ca(o)
{ 
if ( wh.hn(o) == 'h' ) return true;
if ( typeof o !== "object" ) return false;
for(var i in o){ 
if ( o.hasOwnProperty(i) ){
if (_ca(o[i])) return true;
}
}
return false;
}
function _da( node, attrname, opindex, raw, o )
{
var isaffected = false;
var value = $gdc( raw, "", 2 );
if ( o.ap && value && value.constructor===Function ) 
{
attrname = "$wxs:" + attrname; 
node.attr["$gdc"] = $gdc;
}
if ( o.is_affected || _ca(raw) ) 
{
node.n.push( attrname );
node.raw[attrname] = raw;
}
node.attr[attrname] = value;
}
function _r( node, attrname, opindex, env, scope, global ) 
{
global.opindex=opindex;
var o = {}, _env;
var a = grb( z[opindex], env, scope, global, o );
_da( node, attrname, opindex, a, o );
}
function _rz( z, node, attrname, opindex, env, scope, global ) 
{
global.opindex=opindex;
var o = {}, _env;
var a = grb( z[opindex], env, scope, global, o );
_da( node, attrname, opindex, a, o );
}
function _o( opindex, env, scope, global )
{
global.opindex=opindex;
var nothing = {};
var r = grb( z[opindex], env, scope, global, nothing );
return (r&&r.constructor===Function) ? undefined : r;
}
function _oz( z, opindex, env, scope, global )
{
global.opindex=opindex;
var nothing = {};
var r = grb( z[opindex], env, scope, global, nothing );
return (r&&r.constructor===Function) ? undefined : r;
}
function _1( opindex, env, scope, global, o )
{
var o = o || {};
global.opindex=opindex;
return gra( z[opindex], env, scope, global, o );
}
function _1z( z, opindex, env, scope, global, o )
{
var o = o || {};
global.opindex=opindex;
return gra( z[opindex], env, scope, global, o );
}
function _2( opindex, func, env, scope, global, father, itemname, indexname, keyname )
{
var o = {};
var to_iter = _1( opindex, env, scope, global );
wfor( to_iter, func, env, scope, global, father, itemname, indexname, keyname );
}
function _2z( z, opindex, func, env, scope, global, father, itemname, indexname, keyname )
{
var o = {};
var to_iter = _1z( z, opindex, env, scope, global );
wfor( to_iter, func, env, scope, global, father, itemname, indexname, keyname );
}


function _m(tag,attrs,generics,env,scope,global)
{
var tmp=_n(tag);
var base=0;
for(var i = 0 ; i < attrs.length ; i+=2 )
{
if(base+attrs[i+1]<0)
{
tmp.attr[attrs[i]]=true;
}
else
{
_r(tmp,attrs[i],base+attrs[i+1],env,scope,global);
if(base===0)base=attrs[i+1];
}
}
for(var i=0;i<generics.length;i+=2)
{
if(base+generics[i+1]<0)
{
tmp.generics[generics[i]]="";
}
else
{
var $t=grb(z[base+generics[i+1]],env,scope,global);
if ($t!="") $t="wx-"+$t;
tmp.generics[generics[i]]=$t;
if(base===0)base=generics[i+1];
}
}
return tmp;
}
function _mz(z,tag,attrs,generics,env,scope,global)
{
var tmp=_n(tag);
var base=0;
for(var i = 0 ; i < attrs.length ; i+=2 )
{
if(base+attrs[i+1]<0)
{
tmp.attr[attrs[i]]=true;
}
else
{
_rz(z, tmp,attrs[i],base+attrs[i+1],env,scope,global);
if(base===0)base=attrs[i+1];
}
}
for(var i=0;i<generics.length;i+=2)
{
if(base+generics[i+1]<0)
{
tmp.generics[generics[i]]="";
}
else
{
var $t=grb(z[base+generics[i+1]],env,scope,global);
if ($t!="") $t="wx-"+$t;
tmp.generics[generics[i]]=$t;
if(base===0)base=generics[i+1];
}
}
return tmp;
}

var nf_init=function(){
if(typeof __WXML_GLOBAL__==="undefined"||undefined===__WXML_GLOBAL__.wxs_nf_init){
nf_init_Object();nf_init_Function();nf_init_Array();nf_init_String();nf_init_Boolean();nf_init_Number();nf_init_Math();nf_init_Date();nf_init_RegExp();
}
if(typeof __WXML_GLOBAL__!=="undefined") __WXML_GLOBAL__.wxs_nf_init=true;
};
var nf_init_Object=function(){
Object.defineProperty(Object.prototype,"nv_constructor",{writable:true,value:"Object"})
Object.defineProperty(Object.prototype,"nv_toString",{writable:true,value:function(){return "[object Object]"}})
}
var nf_init_Function=function(){
Object.defineProperty(Function.prototype,"nv_constructor",{writable:true,value:"Function"})
Object.defineProperty(Function.prototype,"nv_length",{get:function(){return this.length;},set:function(){}});
Object.defineProperty(Function.prototype,"nv_toString",{writable:true,value:function(){return "[function Function]"}})
}
var nf_init_Array=function(){
Object.defineProperty(Array.prototype,"nv_toString",{writable:true,value:function(){return this.nv_join();}})
Object.defineProperty(Array.prototype,"nv_join",{writable:true,value:function(s){
s=undefined==s?',':s;
var r="";
for(var i=0;i<this.length;++i){
if(0!=i) r+=s;
if(null==this[i]||undefined==this[i]) r+='';	
else if(typeof this[i]=='function') r+=this[i].nv_toString();
else if(typeof this[i]=='object'&&this[i].nv_constructor==="Array") r+=this[i].nv_join();
else r+=this[i].toString();
}
return r;
}})
Object.defineProperty(Array.prototype,"nv_constructor",{writable:true,value:"Array"})
Object.defineProperty(Array.prototype,"nv_concat",{writable:true,value:Array.prototype.concat})
Object.defineProperty(Array.prototype,"nv_pop",{writable:true,value:Array.prototype.pop})
Object.defineProperty(Array.prototype,"nv_push",{writable:true,value:Array.prototype.push})
Object.defineProperty(Array.prototype,"nv_reverse",{writable:true,value:Array.prototype.reverse})
Object.defineProperty(Array.prototype,"nv_shift",{writable:true,value:Array.prototype.shift})
Object.defineProperty(Array.prototype,"nv_slice",{writable:true,value:Array.prototype.slice})
Object.defineProperty(Array.prototype,"nv_sort",{writable:true,value:Array.prototype.sort})
Object.defineProperty(Array.prototype,"nv_splice",{writable:true,value:Array.prototype.splice})
Object.defineProperty(Array.prototype,"nv_unshift",{writable:true,value:Array.prototype.unshift})
Object.defineProperty(Array.prototype,"nv_indexOf",{writable:true,value:Array.prototype.indexOf})
Object.defineProperty(Array.prototype,"nv_lastIndexOf",{writable:true,value:Array.prototype.lastIndexOf})
Object.defineProperty(Array.prototype,"nv_every",{writable:true,value:Array.prototype.every})
Object.defineProperty(Array.prototype,"nv_some",{writable:true,value:Array.prototype.some})
Object.defineProperty(Array.prototype,"nv_forEach",{writable:true,value:Array.prototype.forEach})
Object.defineProperty(Array.prototype,"nv_map",{writable:true,value:Array.prototype.map})
Object.defineProperty(Array.prototype,"nv_filter",{writable:true,value:Array.prototype.filter})
Object.defineProperty(Array.prototype,"nv_reduce",{writable:true,value:Array.prototype.reduce})
Object.defineProperty(Array.prototype,"nv_reduceRight",{writable:true,value:Array.prototype.reduceRight})
Object.defineProperty(Array.prototype,"nv_length",{get:function(){return this.length;},set:function(value){this.length=value;}});
}
var nf_init_String=function(){
Object.defineProperty(String.prototype,"nv_constructor",{writable:true,value:"String"})
Object.defineProperty(String.prototype,"nv_toString",{writable:true,value:String.prototype.toString})
Object.defineProperty(String.prototype,"nv_valueOf",{writable:true,value:String.prototype.valueOf})
Object.defineProperty(String.prototype,"nv_charAt",{writable:true,value:String.prototype.charAt})
Object.defineProperty(String.prototype,"nv_charCodeAt",{writable:true,value:String.prototype.charCodeAt})
Object.defineProperty(String.prototype,"nv_concat",{writable:true,value:String.prototype.concat})
Object.defineProperty(String.prototype,"nv_indexOf",{writable:true,value:String.prototype.indexOf})
Object.defineProperty(String.prototype,"nv_lastIndexOf",{writable:true,value:String.prototype.lastIndexOf})
Object.defineProperty(String.prototype,"nv_localeCompare",{writable:true,value:String.prototype.localeCompare})
Object.defineProperty(String.prototype,"nv_match",{writable:true,value:String.prototype.match})
Object.defineProperty(String.prototype,"nv_replace",{writable:true,value:String.prototype.replace})
Object.defineProperty(String.prototype,"nv_search",{writable:true,value:String.prototype.search})
Object.defineProperty(String.prototype,"nv_slice",{writable:true,value:String.prototype.slice})
Object.defineProperty(String.prototype,"nv_split",{writable:true,value:String.prototype.split})
Object.defineProperty(String.prototype,"nv_substring",{writable:true,value:String.prototype.substring})
Object.defineProperty(String.prototype,"nv_toLowerCase",{writable:true,value:String.prototype.toLowerCase})
Object.defineProperty(String.prototype,"nv_toLocaleLowerCase",{writable:true,value:String.prototype.toLocaleLowerCase})
Object.defineProperty(String.prototype,"nv_toUpperCase",{writable:true,value:String.prototype.toUpperCase})
Object.defineProperty(String.prototype,"nv_toLocaleUpperCase",{writable:true,value:String.prototype.toLocaleUpperCase})
Object.defineProperty(String.prototype,"nv_trim",{writable:true,value:String.prototype.trim})
Object.defineProperty(String.prototype,"nv_length",{get:function(){return this.length;},set:function(value){this.length=value;}});
}
var nf_init_Boolean=function(){
Object.defineProperty(Boolean.prototype,"nv_constructor",{writable:true,value:"Boolean"})
Object.defineProperty(Boolean.prototype,"nv_toString",{writable:true,value:Boolean.prototype.toString})
Object.defineProperty(Boolean.prototype,"nv_valueOf",{writable:true,value:Boolean.prototype.valueOf})
}
var nf_init_Number=function(){
Object.defineProperty(Number,"nv_MAX_VALUE",{writable:false,value:Number.MAX_VALUE})
Object.defineProperty(Number,"nv_MIN_VALUE",{writable:false,value:Number.MIN_VALUE})
Object.defineProperty(Number,"nv_NEGATIVE_INFINITY",{writable:false,value:Number.NEGATIVE_INFINITY})
Object.defineProperty(Number,"nv_POSITIVE_INFINITY",{writable:false,value:Number.POSITIVE_INFINITY})
Object.defineProperty(Number.prototype,"nv_constructor",{writable:true,value:"Number"})
Object.defineProperty(Number.prototype,"nv_toString",{writable:true,value:Number.prototype.toString})
Object.defineProperty(Number.prototype,"nv_toLocaleString",{writable:true,value:Number.prototype.toLocaleString})
Object.defineProperty(Number.prototype,"nv_valueOf",{writable:true,value:Number.prototype.valueOf})
Object.defineProperty(Number.prototype,"nv_toFixed",{writable:true,value:Number.prototype.toFixed})
Object.defineProperty(Number.prototype,"nv_toExponential",{writable:true,value:Number.prototype.toExponential})
Object.defineProperty(Number.prototype,"nv_toPrecision",{writable:true,value:Number.prototype.toPrecision})
}
var nf_init_Math=function(){
Object.defineProperty(Math,"nv_E",{writable:false,value:Math.E})
Object.defineProperty(Math,"nv_LN10",{writable:false,value:Math.LN10})
Object.defineProperty(Math,"nv_LN2",{writable:false,value:Math.LN2})
Object.defineProperty(Math,"nv_LOG2E",{writable:false,value:Math.LOG2E})
Object.defineProperty(Math,"nv_LOG10E",{writable:false,value:Math.LOG10E})
Object.defineProperty(Math,"nv_PI",{writable:false,value:Math.PI})
Object.defineProperty(Math,"nv_SQRT1_2",{writable:false,value:Math.SQRT1_2})
Object.defineProperty(Math,"nv_SQRT2",{writable:false,value:Math.SQRT2})
Object.defineProperty(Math,"nv_abs",{writable:false,value:Math.abs})
Object.defineProperty(Math,"nv_acos",{writable:false,value:Math.acos})
Object.defineProperty(Math,"nv_asin",{writable:false,value:Math.asin})
Object.defineProperty(Math,"nv_atan",{writable:false,value:Math.atan})
Object.defineProperty(Math,"nv_atan2",{writable:false,value:Math.atan2})
Object.defineProperty(Math,"nv_ceil",{writable:false,value:Math.ceil})
Object.defineProperty(Math,"nv_cos",{writable:false,value:Math.cos})
Object.defineProperty(Math,"nv_exp",{writable:false,value:Math.exp})
Object.defineProperty(Math,"nv_floor",{writable:false,value:Math.floor})
Object.defineProperty(Math,"nv_log",{writable:false,value:Math.log})
Object.defineProperty(Math,"nv_max",{writable:false,value:Math.max})
Object.defineProperty(Math,"nv_min",{writable:false,value:Math.min})
Object.defineProperty(Math,"nv_pow",{writable:false,value:Math.pow})
Object.defineProperty(Math,"nv_random",{writable:false,value:Math.random})
Object.defineProperty(Math,"nv_round",{writable:false,value:Math.round})
Object.defineProperty(Math,"nv_sin",{writable:false,value:Math.sin})
Object.defineProperty(Math,"nv_sqrt",{writable:false,value:Math.sqrt})
Object.defineProperty(Math,"nv_tan",{writable:false,value:Math.tan})
}
var nf_init_Date=function(){
Object.defineProperty(Date.prototype,"nv_constructor",{writable:true,value:"Date"})
Object.defineProperty(Date,"nv_parse",{writable:true,value:Date.parse})
Object.defineProperty(Date,"nv_UTC",{writable:true,value:Date.UTC})
Object.defineProperty(Date,"nv_now",{writable:true,value:Date.now})
Object.defineProperty(Date.prototype,"nv_toString",{writable:true,value:Date.prototype.toString})
Object.defineProperty(Date.prototype,"nv_toDateString",{writable:true,value:Date.prototype.toDateString})
Object.defineProperty(Date.prototype,"nv_toTimeString",{writable:true,value:Date.prototype.toTimeString})
Object.defineProperty(Date.prototype,"nv_toLocaleString",{writable:true,value:Date.prototype.toLocaleString})
Object.defineProperty(Date.prototype,"nv_toLocaleDateString",{writable:true,value:Date.prototype.toLocaleDateString})
Object.defineProperty(Date.prototype,"nv_toLocaleTimeString",{writable:true,value:Date.prototype.toLocaleTimeString})
Object.defineProperty(Date.prototype,"nv_valueOf",{writable:true,value:Date.prototype.valueOf})
Object.defineProperty(Date.prototype,"nv_getTime",{writable:true,value:Date.prototype.getTime})
Object.defineProperty(Date.prototype,"nv_getFullYear",{writable:true,value:Date.prototype.getFullYear})
Object.defineProperty(Date.prototype,"nv_getUTCFullYear",{writable:true,value:Date.prototype.getUTCFullYear})
Object.defineProperty(Date.prototype,"nv_getMonth",{writable:true,value:Date.prototype.getMonth})
Object.defineProperty(Date.prototype,"nv_getUTCMonth",{writable:true,value:Date.prototype.getUTCMonth})
Object.defineProperty(Date.prototype,"nv_getDate",{writable:true,value:Date.prototype.getDate})
Object.defineProperty(Date.prototype,"nv_getUTCDate",{writable:true,value:Date.prototype.getUTCDate})
Object.defineProperty(Date.prototype,"nv_getDay",{writable:true,value:Date.prototype.getDay})
Object.defineProperty(Date.prototype,"nv_getUTCDay",{writable:true,value:Date.prototype.getUTCDay})
Object.defineProperty(Date.prototype,"nv_getHours",{writable:true,value:Date.prototype.getHours})
Object.defineProperty(Date.prototype,"nv_getUTCHours",{writable:true,value:Date.prototype.getUTCHours})
Object.defineProperty(Date.prototype,"nv_getMinutes",{writable:true,value:Date.prototype.getMinutes})
Object.defineProperty(Date.prototype,"nv_getUTCMinutes",{writable:true,value:Date.prototype.getUTCMinutes})
Object.defineProperty(Date.prototype,"nv_getSeconds",{writable:true,value:Date.prototype.getSeconds})
Object.defineProperty(Date.prototype,"nv_getUTCSeconds",{writable:true,value:Date.prototype.getUTCSeconds})
Object.defineProperty(Date.prototype,"nv_getMilliseconds",{writable:true,value:Date.prototype.getMilliseconds})
Object.defineProperty(Date.prototype,"nv_getUTCMilliseconds",{writable:true,value:Date.prototype.getUTCMilliseconds})
Object.defineProperty(Date.prototype,"nv_getTimezoneOffset",{writable:true,value:Date.prototype.getTimezoneOffset})
Object.defineProperty(Date.prototype,"nv_setTime",{writable:true,value:Date.prototype.setTime})
Object.defineProperty(Date.prototype,"nv_setMilliseconds",{writable:true,value:Date.prototype.setMilliseconds})
Object.defineProperty(Date.prototype,"nv_setUTCMilliseconds",{writable:true,value:Date.prototype.setUTCMilliseconds})
Object.defineProperty(Date.prototype,"nv_setSeconds",{writable:true,value:Date.prototype.setSeconds})
Object.defineProperty(Date.prototype,"nv_setUTCSeconds",{writable:true,value:Date.prototype.setUTCSeconds})
Object.defineProperty(Date.prototype,"nv_setMinutes",{writable:true,value:Date.prototype.setMinutes})
Object.defineProperty(Date.prototype,"nv_setUTCMinutes",{writable:true,value:Date.prototype.setUTCMinutes})
Object.defineProperty(Date.prototype,"nv_setHours",{writable:true,value:Date.prototype.setHours})
Object.defineProperty(Date.prototype,"nv_setUTCHours",{writable:true,value:Date.prototype.setUTCHours})
Object.defineProperty(Date.prototype,"nv_setDate",{writable:true,value:Date.prototype.setDate})
Object.defineProperty(Date.prototype,"nv_setUTCDate",{writable:true,value:Date.prototype.setUTCDate})
Object.defineProperty(Date.prototype,"nv_setMonth",{writable:true,value:Date.prototype.setMonth})
Object.defineProperty(Date.prototype,"nv_setUTCMonth",{writable:true,value:Date.prototype.setUTCMonth})
Object.defineProperty(Date.prototype,"nv_setFullYear",{writable:true,value:Date.prototype.setFullYear})
Object.defineProperty(Date.prototype,"nv_setUTCFullYear",{writable:true,value:Date.prototype.setUTCFullYear})
Object.defineProperty(Date.prototype,"nv_toUTCString",{writable:true,value:Date.prototype.toUTCString})
Object.defineProperty(Date.prototype,"nv_toISOString",{writable:true,value:Date.prototype.toISOString})
Object.defineProperty(Date.prototype,"nv_toJSON",{writable:true,value:Date.prototype.toJSON})
}
var nf_init_RegExp=function(){
Object.defineProperty(RegExp.prototype,"nv_constructor",{writable:true,value:"RegExp"})
Object.defineProperty(RegExp.prototype,"nv_exec",{writable:true,value:RegExp.prototype.exec})
Object.defineProperty(RegExp.prototype,"nv_test",{writable:true,value:RegExp.prototype.test})
Object.defineProperty(RegExp.prototype,"nv_toString",{writable:true,value:RegExp.prototype.toString})
Object.defineProperty(RegExp.prototype,"nv_source",{get:function(){return this.source;},set:function(){}});
Object.defineProperty(RegExp.prototype,"nv_global",{get:function(){return this.global;},set:function(){}});
Object.defineProperty(RegExp.prototype,"nv_ignoreCase",{get:function(){return this.ignoreCase;},set:function(){}});
Object.defineProperty(RegExp.prototype,"nv_multiline",{get:function(){return this.multiline;},set:function(){}});
Object.defineProperty(RegExp.prototype,"nv_lastIndex",{get:function(){return this.lastIndex;},set:function(v){this.lastIndex=v;}});
}
nf_init();
var nv_getDate=function(){var args=Array.prototype.slice.call(arguments);args.unshift(Date);return new(Function.prototype.bind.apply(Date, args));}
var nv_getRegExp=function(){var args=Array.prototype.slice.call(arguments);args.unshift(RegExp);return new(Function.prototype.bind.apply(RegExp, args));}
var nv_console={}
nv_console.nv_log=function(){var res="WXSRT:";for(var i=0;i<arguments.length;++i)res+=arguments[i]+" ";console.log(res);}
var nv_parseInt = parseInt, nv_parseFloat = parseFloat, nv_isNaN = isNaN, nv_isFinite = isFinite, nv_decodeURI = decodeURI, nv_decodeURIComponent = decodeURIComponent, nv_encodeURI = encodeURI, nv_encodeURIComponent = encodeURIComponent;
function $gdc(o,p,r) {
o=wh.rv(o);
if(o===null||o===undefined) return o;
if(o.constructor===String||o.constructor===Boolean||o.constructor===Number) return o;
if(o.constructor===Object){
var copy={};
for(var k in o)
if(o.hasOwnProperty(k))
if(undefined===p) copy[k.substring(3)]=$gdc(o[k],p,r);
else copy[p+k]=$gdc(o[k],p,r);
return copy;
}
if(o.constructor===Array){
var copy=[];
for(var i=0;i<o.length;i++) copy.push($gdc(o[i],p,r));
return copy;
}
if(o.constructor===Date){
var copy=new Date();
copy.setTime(o.getTime());
return copy;
}
if(o.constructor===RegExp){
var f="";
if(o.global) f+="g";
if(o.ignoreCase) f+="i";
if(o.multiline) f+="m";
return (new RegExp(o.source,f));
}
if(r&&o.constructor===Function){
if ( r == 1 ) return $gdc(o(),undefined, 2);
if ( r == 2 ) return o;
}
return null;
}
var nv_JSON={}
nv_JSON.nv_stringify=function(o){
JSON.stringify(o);
return JSON.stringify($gdc(o));
}
nv_JSON.nv_parse=function(o){
if(o===undefined) return undefined;
var t=JSON.parse(o);
return $gdc(t,'nv_');
}

function _af(p, a, r, c){
p.extraAttr = {"t_action": a, "t_rawid": r };
if ( typeof(c) != 'undefined' ) p.extraAttr.t_cid = c;
}

function _ai(i,p,e,me,r,c){var x=_grp(p,e,me);if(x)i.push(x);else{i.push('');_wp(me+':import:'+r+':'+c+': Path `'+p+'` not found from `'+me+'`.')}}
function _grp(p,e,me){if(p[0]!='/'){var mepart=me.split('/');mepart.pop();var ppart=p.split('/');for(var i=0;i<ppart.length;i++){if( ppart[i]=='..')mepart.pop();else if(!ppart[i]||ppart[i]=='.')continue;else mepart.push(ppart[i]);}p=mepart.join('/');}if(me[0]=='.'&&p[0]=='/')p='.'+p;if(e[p])return p;if(e[p+'.wxml'])return p+'.wxml';}
function _gd(p,c,e,d){if(!c)return;if(d[p][c])return d[p][c];for(var x=e[p].i.length-1;x>=0;x--){if(e[p].i[x]&&d[e[p].i[x]][c])return d[e[p].i[x]][c]};for(var x=e[p].ti.length-1;x>=0;x--){var q=_grp(e[p].ti[x],e,p);if(q&&d[q][c])return d[q][c]}var ii=_gapi(e,p);for(var x=0;x<ii.length;x++){if(ii[x]&&d[ii[x]][c])return d[ii[x]][c]}for(var k=e[p].j.length-1;k>=0;k--)if(e[p].j[k]){for(var q=e[e[p].j[k]].ti.length-1;q>=0;q--){var pp=_grp(e[e[p].j[k]].ti[q],e,p);if(pp&&d[pp][c]){return d[pp][c]}}}}
function _gapi(e,p){if(!p)return [];if($gaic[p]){return $gaic[p]};var ret=[],q=[],h=0,t=0,put={},visited={};q.push(p);visited[p]=true;t++;while(h<t){var a=q[h++];for(var i=0;i<e[a].ic.length;i++){var nd=e[a].ic[i];var np=_grp(nd,e,a);if(np&&!visited[np]){visited[np]=true;q.push(np);t++;}}for(var i=0;a!=p&&i<e[a].ti.length;i++){var ni=e[a].ti[i];var nm=_grp(ni,e,a);if(nm&&!put[nm]){put[nm]=true;ret.push(nm);}}}$gaic[p]=ret;return ret;}
var $ixc={};function _ic(p,ent,me,e,s,r,gg){var x=_grp(p,ent,me);ent[me].j.push(x);if(x){if($ixc[x]){_wp('-1:include:-1:-1: `'+p+'` is being included in a loop, will be stop.');return;}$ixc[x]=true;try{ent[x].f(e,s,r,gg)}catch(e){}$ixc[x]=false;}else{_wp(me+':include:-1:-1: Included path `'+p+'` not found from `'+me+'`.')}}
function _w(tn,f,line,c){_wp(f+':template:'+line+':'+c+': Template `'+tn+'` not found.');}function _ev(dom){var changed=false;delete dom.properities;delete dom.n;if(dom.children){do{changed=false;var newch = [];for(var i=0;i<dom.children.length;i++){var ch=dom.children[i];if( ch.tag=='virtual'){changed=true;for(var j=0;ch.children&&j<ch.children.length;j++){newch.push(ch.children[j]);}}else { newch.push(ch); } } dom.children = newch; }while(changed);for(var i=0;i<dom.children.length;i++){_ev(dom.children[i]);}} return dom; }
function _tsd( root )
{
if( root.tag == "wx-wx-scope" ) 
{
root.tag = "virtual";
root.wxCkey = "11";
root['wxScopeData'] = root.attr['wx:scope-data'];
delete root.n;
delete root.raw;
delete root.generics;
delete root.attr;
}
for( var i = 0 ; root.children && i < root.children.length ; i++ )
{
_tsd( root.children[i] );
}
return root;
}

var e_={}
if(typeof(global.entrys)==='undefined')global.entrys={};e_=global.entrys;
var d_={}
if(typeof(global.defines)==='undefined')global.defines={};d_=global.defines;
var f_={}
if(typeof(global.modules)==='undefined')global.modules={};f_=global.modules || {};
var p_={}
__WXML_GLOBAL__.ops_cached = __WXML_GLOBAL__.ops_cached || {}
__WXML_GLOBAL__.ops_set = __WXML_GLOBAL__.ops_set || {};
__WXML_GLOBAL__.ops_init = __WXML_GLOBAL__.ops_init || {};
var z=__WXML_GLOBAL__.ops_set.$gwx || [];
function gz$gwx_1(){
if( __WXML_GLOBAL__.ops_cached.$gwx_1)return __WXML_GLOBAL__.ops_cached.$gwx_1
__WXML_GLOBAL__.ops_cached.$gwx_1=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_1);return __WXML_GLOBAL__.ops_cached.$gwx_1
}
function gz$gwx_2(){
if( __WXML_GLOBAL__.ops_cached.$gwx_2)return __WXML_GLOBAL__.ops_cached.$gwx_2
__WXML_GLOBAL__.ops_cached.$gwx_2=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_2);return __WXML_GLOBAL__.ops_cached.$gwx_2
}
function gz$gwx_3(){
if( __WXML_GLOBAL__.ops_cached.$gwx_3)return __WXML_GLOBAL__.ops_cached.$gwx_3
__WXML_GLOBAL__.ops_cached.$gwx_3=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([3,'nav-wrap'])
Z([a,[3,'height: '],[[2,'+'],[[2,'*'],[[7],[3,'height']],[1,2]],[1,20]],[3,'px;']])
Z([[6],[[7],[3,'navbarData']],[3,'showCapsule']])
Z([[6],[[7],[3,'navbarData']],[3,'showpop']])
Z(z[3])
})(__WXML_GLOBAL__.ops_cached.$gwx_3);return __WXML_GLOBAL__.ops_cached.$gwx_3
}
function gz$gwx_4(){
if( __WXML_GLOBAL__.ops_cached.$gwx_4)return __WXML_GLOBAL__.ops_cached.$gwx_4
__WXML_GLOBAL__.ops_cached.$gwx_4=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_4);return __WXML_GLOBAL__.ops_cached.$gwx_4
}
function gz$gwx_5(){
if( __WXML_GLOBAL__.ops_cached.$gwx_5)return __WXML_GLOBAL__.ops_cached.$gwx_5
__WXML_GLOBAL__.ops_cached.$gwx_5=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_5);return __WXML_GLOBAL__.ops_cached.$gwx_5
}
function gz$gwx_6(){
if( __WXML_GLOBAL__.ops_cached.$gwx_6)return __WXML_GLOBAL__.ops_cached.$gwx_6
__WXML_GLOBAL__.ops_cached.$gwx_6=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([3,'navbar'])
Z([[7],[3,'navbarData']])
})(__WXML_GLOBAL__.ops_cached.$gwx_6);return __WXML_GLOBAL__.ops_cached.$gwx_6
}
function gz$gwx_7(){
if( __WXML_GLOBAL__.ops_cached.$gwx_7)return __WXML_GLOBAL__.ops_cached.$gwx_7
__WXML_GLOBAL__.ops_cached.$gwx_7=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[2,'!'],[[7],[3,'listIsEmpty']]])
Z([[2,'!'],[[7],[3,'BlueToothAdapter']]])
Z([[2,'&&'],[[2,'&&'],[[7],[3,'listIsEmpty']],[[2,'!'],[[7],[3,'isSearch']]]],[[7],[3,'BlueToothAdapter']]])
Z(z[2])
})(__WXML_GLOBAL__.ops_cached.$gwx_7);return __WXML_GLOBAL__.ops_cached.$gwx_7
}
function gz$gwx_8(){
if( __WXML_GLOBAL__.ops_cached.$gwx_8)return __WXML_GLOBAL__.ops_cached.$gwx_8
__WXML_GLOBAL__.ops_cached.$gwx_8=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[7],[3,'navbarData']])
})(__WXML_GLOBAL__.ops_cached.$gwx_8);return __WXML_GLOBAL__.ops_cached.$gwx_8
}
function gz$gwx_9(){
if( __WXML_GLOBAL__.ops_cached.$gwx_9)return __WXML_GLOBAL__.ops_cached.$gwx_9
__WXML_GLOBAL__.ops_cached.$gwx_9=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[7],[3,'navbarData']])
Z([3,'_error'])
Z([3,'_success'])
Z([3,'取消'])
Z([3,'删除'])
Z([3,'是否删除此定时消杀？'])
Z([3,'popup'])
Z([3,''])
})(__WXML_GLOBAL__.ops_cached.$gwx_9);return __WXML_GLOBAL__.ops_cached.$gwx_9
}
function gz$gwx_10(){
if( __WXML_GLOBAL__.ops_cached.$gwx_10)return __WXML_GLOBAL__.ops_cached.$gwx_10
__WXML_GLOBAL__.ops_cached.$gwx_10=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[7],[3,'navbarData']])
Z([3,'content'])
Z([a,[3,'margin-top: '],[[2,'+'],[[2,'*'],[[7],[3,'height']],[1,2]],[1,20]],[3,'rpx']])
Z([[2,'=='],[[7],[3,'idx']],[1,1]])
Z([[2,'=='],[[7],[3,'idx']],[1,2]])
Z([[2,'=='],[[7],[3,'idx']],[1,3]])
})(__WXML_GLOBAL__.ops_cached.$gwx_10);return __WXML_GLOBAL__.ops_cached.$gwx_10
}
function gz$gwx_11(){
if( __WXML_GLOBAL__.ops_cached.$gwx_11)return __WXML_GLOBAL__.ops_cached.$gwx_11
__WXML_GLOBAL__.ops_cached.$gwx_11=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([3,'container home-page'])
Z([a,[3,'margin-top: '],[[7],[3,'height']],[3,'rpx']])
Z([3,'connect_box'])
Z([[2,'||'],[[2,'=='],[[7],[3,'flag']],[1,1]],[[2,'=='],[[7],[3,'flag']],[1,6]]])
Z([[2,'&&'],[[2,'||'],[[2,'||'],[[2,'||'],[[2,'=='],[[7],[3,'flag']],[1,2]],[[2,'!'],[[7],[3,'a']]]],[[2,'!'],[[7],[3,'b']]]],[[2,'!'],[[7],[3,'c']]]],[[7],[3,'connecting']]])
Z([[2,'&&'],[[2,'&&'],[[2,'&&'],[[2,'=='],[[7],[3,'flag']],[1,3]],[[7],[3,'a']]],[[7],[3,'b']]],[[7],[3,'c']]])
Z([[2,'&&'],[[2,'&&'],[[2,'&&'],[[2,'=='],[[7],[3,'flag']],[1,4]],[[7],[3,'a']]],[[7],[3,'b']]],[[7],[3,'c']]])
Z([[2,'=='],[[7],[3,'flag']],[1,5]])
Z([[2,'&&'],[[2,'&&'],[[2,'&&'],[[2,'!='],[[7],[3,'flag']],[1,1]],[[7],[3,'a']]],[[7],[3,'b']]],[[7],[3,'c']]])
Z([3,'_error'])
Z([3,'_success'])
Z([3,'稍后再试'])
Z([3,'立即重连'])
Z([3,'请尝试以下操作:\n1.请确认设备电量充足,并处于开机状态\n2.将设备靠近要连接的手机(10米以内)'])
Z([3,'popup'])
Z([3,'连接失败'])
})(__WXML_GLOBAL__.ops_cached.$gwx_11);return __WXML_GLOBAL__.ops_cached.$gwx_11
}
function gz$gwx_12(){
if( __WXML_GLOBAL__.ops_cached.$gwx_12)return __WXML_GLOBAL__.ops_cached.$gwx_12
__WXML_GLOBAL__.ops_cached.$gwx_12=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_12);return __WXML_GLOBAL__.ops_cached.$gwx_12
}
function gz$gwx_13(){
if( __WXML_GLOBAL__.ops_cached.$gwx_13)return __WXML_GLOBAL__.ops_cached.$gwx_13
__WXML_GLOBAL__.ops_cached.$gwx_13=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_13);return __WXML_GLOBAL__.ops_cached.$gwx_13
}
function gz$gwx_14(){
if( __WXML_GLOBAL__.ops_cached.$gwx_14)return __WXML_GLOBAL__.ops_cached.$gwx_14
__WXML_GLOBAL__.ops_cached.$gwx_14=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[7],[3,'navbarData']])
})(__WXML_GLOBAL__.ops_cached.$gwx_14);return __WXML_GLOBAL__.ops_cached.$gwx_14
}
function gz$gwx_15(){
if( __WXML_GLOBAL__.ops_cached.$gwx_15)return __WXML_GLOBAL__.ops_cached.$gwx_15
__WXML_GLOBAL__.ops_cached.$gwx_15=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[7],[3,'navbarData']])
Z([3,'_error'])
Z([3,'_success'])
Z([3,'取消'])
Z([3,'确定'])
Z([3,'此操作会清除所有设置及使用记录！是否继续？'])
Z([3,'popup'])
Z([3,''])
Z([3,'_errorDel'])
Z([3,'_successDel'])
Z(z[3])
Z(z[4])
Z([3,'是否确定删除?'])
Z([3,'Delpopup'])
Z(z[7])
})(__WXML_GLOBAL__.ops_cached.$gwx_15);return __WXML_GLOBAL__.ops_cached.$gwx_15
}
function gz$gwx_16(){
if( __WXML_GLOBAL__.ops_cached.$gwx_16)return __WXML_GLOBAL__.ops_cached.$gwx_16
__WXML_GLOBAL__.ops_cached.$gwx_16=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
Z([[7],[3,'connected']])
Z([[7],[3,'canWrite']])
})(__WXML_GLOBAL__.ops_cached.$gwx_16);return __WXML_GLOBAL__.ops_cached.$gwx_16
}
function gz$gwx_17(){
if( __WXML_GLOBAL__.ops_cached.$gwx_17)return __WXML_GLOBAL__.ops_cached.$gwx_17
__WXML_GLOBAL__.ops_cached.$gwx_17=[];
(function(z){var a=11;function Z(ops){z.push(ops)}
})(__WXML_GLOBAL__.ops_cached.$gwx_17);return __WXML_GLOBAL__.ops_cached.$gwx_17
}
__WXML_GLOBAL__.ops_set.$gwx=z;
__WXML_GLOBAL__.ops_init.$gwx=true;
var nv_require=function(){var nnm={"m_./pages/test/test.wxml:utils":np_0,};var nom={};return function(n){if(n[0]==='p'&&n[1]==='_'&&f_[n.slice(2)])return f_[n.slice(2)];return function(){if(!nnm[n]) return undefined;try{if(!nom[n])nom[n]=nnm[n]();return nom[n];}catch(e){e.message=e.message.replace(/nv_/g,'');var tmp = e.stack.substring(0,e.stack.lastIndexOf(n));e.stack = tmp.substring(0,tmp.lastIndexOf('\n'));e.stack = e.stack.replace(/\snv_/g,' ');e.stack = $gstack(e.stack);e.stack += '\n    at ' + n.substring(2);console.error(e);}
}}}()
f_['./pages/test/test.wxml']={};
f_['./pages/test/test.wxml']['utils'] =nv_require("m_./pages/test/test.wxml:utils");
function np_0(){var nv_module={nv_exports:{}};nv_module.nv_exports.nv_max = (function (nv_n1,nv_n2){return(Math.nv_max(nv_n1,nv_n2))});nv_module.nv_exports.nv_len = (function (nv_arr){nv_arr = nv_arr || [];return(nv_arr.nv_length)});return nv_module.nv_exports;}

var x=['./component/blepop/blepop.wxml','./component/inputPop/inputPop.wxml','./component/navbar/navbar.wxml','./component/popup/popup.wxml','./component/timepop/timepop.wxml','./pages/addtiming/addtime.wxml','./pages/conble/conble.wxml','./pages/deviceInfo/deviceInfo.wxml','./pages/edittiming/edittiming.wxml','./pages/history/history.wxml','./pages/index/index.wxml','./pages/init/init.wxml','./pages/logs/logs.wxml','./pages/problem/problem.wxml','./pages/set/set.wxml','./pages/test/test.wxml','./pages/timing/timing.wxml'];d_[x[0]]={}
var m0=function(e,s,r,gg){
var z=gz$gwx_1()
return r
}
e_[x[0]]={f:m0,j:[],i:[],ti:[],ic:[]}
d_[x[1]]={}
var m1=function(e,s,r,gg){
var z=gz$gwx_2()
return r
}
e_[x[1]]={f:m1,j:[],i:[],ti:[],ic:[]}
d_[x[2]]={}
var m2=function(e,s,r,gg){
var z=gz$gwx_3()
var oD=_mz(z,'view',['class',0,'style',1],[],e,s,gg)
var fE=_v()
_(oD,fE)
if(_oz(z,2,e,s,gg)){fE.wxVkey=1
var hG=_v()
_(fE,hG)
if(_oz(z,3,e,s,gg)){hG.wxVkey=1
}
hG.wxXCkey=1
}
var cF=_v()
_(oD,cF)
if(_oz(z,4,e,s,gg)){cF.wxVkey=1
}
fE.wxXCkey=1
cF.wxXCkey=1
_(r,oD)
return r
}
e_[x[2]]={f:m2,j:[],i:[],ti:[],ic:[]}
d_[x[3]]={}
var m3=function(e,s,r,gg){
var z=gz$gwx_4()
return r
}
e_[x[3]]={f:m3,j:[],i:[],ti:[],ic:[]}
d_[x[4]]={}
var m4=function(e,s,r,gg){
var z=gz$gwx_5()
return r
}
e_[x[4]]={f:m4,j:[],i:[],ti:[],ic:[]}
d_[x[5]]={}
var m5=function(e,s,r,gg){
var z=gz$gwx_6()
var lK=_mz(z,'navbar',['id',0,'navbarData',1],[],e,s,gg)
_(r,lK)
return r
}
e_[x[5]]={f:m5,j:[],i:[],ti:[],ic:[]}
d_[x[6]]={}
var m6=function(e,s,r,gg){
var z=gz$gwx_7()
var tM=_n('view')
_rz(z,tM,'hidden',0,e,s,gg)
var eN=_v()
_(tM,eN)
if(_oz(z,1,e,s,gg)){eN.wxVkey=1
}
var bO=_v()
_(tM,bO)
if(_oz(z,2,e,s,gg)){bO.wxVkey=1
}
var oP=_v()
_(tM,oP)
if(_oz(z,3,e,s,gg)){oP.wxVkey=1
}
eN.wxXCkey=1
bO.wxXCkey=1
oP.wxXCkey=1
_(r,tM)
return r
}
e_[x[6]]={f:m6,j:[],i:[],ti:[],ic:[]}
d_[x[7]]={}
var m7=function(e,s,r,gg){
var z=gz$gwx_8()
var oR=_n('navbar')
_rz(z,oR,'navbarData',0,e,s,gg)
_(r,oR)
return r
}
e_[x[7]]={f:m7,j:[],i:[],ti:[],ic:[]}
d_[x[8]]={}
var m8=function(e,s,r,gg){
var z=gz$gwx_9()
var cT=_n('navbar')
_rz(z,cT,'navbarData',0,e,s,gg)
_(r,cT)
var hU=_mz(z,'popup',['bind:error',1,'bind:success',1,'btn_no',2,'btn_ok',3,'content',4,'id',5,'title',6],[],e,s,gg)
_(r,hU)
return r
}
e_[x[8]]={f:m8,j:[],i:[],ti:[],ic:[]}
d_[x[9]]={}
var m9=function(e,s,r,gg){
var z=gz$gwx_10()
var cW=_n('navbar')
_rz(z,cW,'navbarData',0,e,s,gg)
_(r,cW)
var oX=_mz(z,'view',['class',1,'style',1],[],e,s,gg)
var lY=_v()
_(oX,lY)
if(_oz(z,3,e,s,gg)){lY.wxVkey=1
}
var aZ=_v()
_(oX,aZ)
if(_oz(z,4,e,s,gg)){aZ.wxVkey=1
}
var t1=_v()
_(oX,t1)
if(_oz(z,5,e,s,gg)){t1.wxVkey=1
}
lY.wxXCkey=1
aZ.wxXCkey=1
t1.wxXCkey=1
_(r,oX)
return r
}
e_[x[9]]={f:m9,j:[],i:[],ti:[],ic:[]}
d_[x[10]]={}
var m10=function(e,s,r,gg){
var z=gz$gwx_11()
var b3=_mz(z,'view',['class',0,'style',1],[],e,s,gg)
var x5=_n('view')
_rz(z,x5,'class',2,e,s,gg)
var o6=_v()
_(x5,o6)
if(_oz(z,3,e,s,gg)){o6.wxVkey=1
}
var f7=_v()
_(x5,f7)
if(_oz(z,4,e,s,gg)){f7.wxVkey=1
}
var c8=_v()
_(x5,c8)
if(_oz(z,5,e,s,gg)){c8.wxVkey=1
}
var h9=_v()
_(x5,h9)
if(_oz(z,6,e,s,gg)){h9.wxVkey=1
}
var o0=_v()
_(x5,o0)
if(_oz(z,7,e,s,gg)){o0.wxVkey=1
}
o6.wxXCkey=1
f7.wxXCkey=1
c8.wxXCkey=1
h9.wxXCkey=1
o0.wxXCkey=1
_(b3,x5)
var o4=_v()
_(b3,o4)
if(_oz(z,8,e,s,gg)){o4.wxVkey=1
}
var cAB=_mz(z,'popup',['bind:error',9,'bind:success',1,'btn_no',2,'btn_ok',3,'content',4,'id',5,'title',6],[],e,s,gg)
_(b3,cAB)
o4.wxXCkey=1
_(r,b3)
return r
}
e_[x[10]]={f:m10,j:[],i:[],ti:[],ic:[]}
d_[x[11]]={}
var m11=function(e,s,r,gg){
var z=gz$gwx_12()
return r
}
e_[x[11]]={f:m11,j:[],i:[],ti:[],ic:[]}
d_[x[12]]={}
var m12=function(e,s,r,gg){
var z=gz$gwx_13()
return r
}
e_[x[12]]={f:m12,j:[],i:[],ti:[],ic:[]}
d_[x[13]]={}
var m13=function(e,s,r,gg){
var z=gz$gwx_14()
var tEB=_n('navbar')
_rz(z,tEB,'navbarData',0,e,s,gg)
_(r,tEB)
return r
}
e_[x[13]]={f:m13,j:[],i:[],ti:[],ic:[]}
d_[x[14]]={}
var m14=function(e,s,r,gg){
var z=gz$gwx_15()
var bGB=_n('navbar')
_rz(z,bGB,'navbarData',0,e,s,gg)
_(r,bGB)
var oHB=_mz(z,'popup',['bind:error',1,'bind:success',1,'btn_no',2,'btn_ok',3,'content',4,'id',5,'title',6],[],e,s,gg)
_(r,oHB)
var xIB=_mz(z,'popup',['bind:error',8,'bind:success',1,'btn_no',2,'btn_ok',3,'content',4,'id',5,'title',6],[],e,s,gg)
_(r,xIB)
return r
}
e_[x[14]]={f:m14,j:[],i:[],ti:[],ic:[]}
d_[x[15]]={}
var m15=function(e,s,r,gg){
var z=gz$gwx_16()
var fKB=_v()
_(r,fKB)
if(_oz(z,0,e,s,gg)){fKB.wxVkey=1
var cLB=_v()
_(fKB,cLB)
if(_oz(z,1,e,s,gg)){cLB.wxVkey=1
}
cLB.wxXCkey=1
}
fKB.wxXCkey=1
return r
}
e_[x[15]]={f:m15,j:[],i:[],ti:[],ic:[]}
d_[x[16]]={}
var m16=function(e,s,r,gg){
var z=gz$gwx_17()
return r
}
e_[x[16]]={f:m16,j:[],i:[],ti:[],ic:[]}
if(path&&e_[path]){
return function(env,dd,global){$gwxc=0;var root={"tag":"wx-page"};root.children=[]
var main=e_[path].f
if (typeof global==="undefined")global={};global.f=$gdc(f_[path],"",1);
try{
main(env,{},root,global);
_tsd(root)
}catch(err){
console.log(err)
}
return root;
}
}
}
	__wxAppCode__['component/blepop/blepop.json'] = {"component":true,"usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['component/blepop/blepop.wxml'] = [$gwx, './component/blepop/blepop.wxml'];else __wxAppCode__['component/blepop/blepop.wxml'] = $gwx( './component/blepop/blepop.wxml' );
		__wxAppCode__['component/inputPop/inputPop.json'] = {"component":true,"usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['component/inputPop/inputPop.wxml'] = [$gwx, './component/inputPop/inputPop.wxml'];else __wxAppCode__['component/inputPop/inputPop.wxml'] = $gwx( './component/inputPop/inputPop.wxml' );
		__wxAppCode__['component/navbar/navbar.json'] = {"component":true,"usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['component/navbar/navbar.wxml'] = [$gwx, './component/navbar/navbar.wxml'];else __wxAppCode__['component/navbar/navbar.wxml'] = $gwx( './component/navbar/navbar.wxml' );
		__wxAppCode__['component/popup/popup.json'] = {"component":true,"usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['component/popup/popup.wxml'] = [$gwx, './component/popup/popup.wxml'];else __wxAppCode__['component/popup/popup.wxml'] = $gwx( './component/popup/popup.wxml' );
		__wxAppCode__['component/timepop/timepop.json'] = {"component":true,"usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['component/timepop/timepop.wxml'] = [$gwx, './component/timepop/timepop.wxml'];else __wxAppCode__['component/timepop/timepop.wxml'] = $gwx( './component/timepop/timepop.wxml' );
		__wxAppCode__['pages/addtiming/addtime.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar","timepop":"/component/timepop/timepop"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/addtiming/addtime.wxml'] = [$gwx, './pages/addtiming/addtime.wxml'];else __wxAppCode__['pages/addtiming/addtime.wxml'] = $gwx( './pages/addtiming/addtime.wxml' );
		__wxAppCode__['pages/conble/conble.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/conble/conble.wxml'] = [$gwx, './pages/conble/conble.wxml'];else __wxAppCode__['pages/conble/conble.wxml'] = $gwx( './pages/conble/conble.wxml' );
		__wxAppCode__['pages/deviceInfo/deviceInfo.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/deviceInfo/deviceInfo.wxml'] = [$gwx, './pages/deviceInfo/deviceInfo.wxml'];else __wxAppCode__['pages/deviceInfo/deviceInfo.wxml'] = $gwx( './pages/deviceInfo/deviceInfo.wxml' );
		__wxAppCode__['pages/edittiming/edittiming.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar","popup":"/component/popup/popup"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/edittiming/edittiming.wxml'] = [$gwx, './pages/edittiming/edittiming.wxml'];else __wxAppCode__['pages/edittiming/edittiming.wxml'] = $gwx( './pages/edittiming/edittiming.wxml' );
		__wxAppCode__['pages/history/history.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/history/history.wxml'] = [$gwx, './pages/history/history.wxml'];else __wxAppCode__['pages/history/history.wxml'] = $gwx( './pages/history/history.wxml' );
		__wxAppCode__['pages/index/index.json'] = {"usingComponents":{"popup":"/component/popup/popup","navbar":"/component/navbar/navbar","blepop":"/component/blepop/blepop"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/index/index.wxml'] = [$gwx, './pages/index/index.wxml'];else __wxAppCode__['pages/index/index.wxml'] = $gwx( './pages/index/index.wxml' );
		__wxAppCode__['pages/init/init.json'] = {"usingComponents":{},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/init/init.wxml'] = [$gwx, './pages/init/init.wxml'];else __wxAppCode__['pages/init/init.wxml'] = $gwx( './pages/init/init.wxml' );
		__wxAppCode__['pages/logs/logs.json'] = {"navigationBarTitleText":"查看启动日志","usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/logs/logs.wxml'] = [$gwx, './pages/logs/logs.wxml'];else __wxAppCode__['pages/logs/logs.wxml'] = $gwx( './pages/logs/logs.wxml' );
		__wxAppCode__['pages/problem/problem.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/problem/problem.wxml'] = [$gwx, './pages/problem/problem.wxml'];else __wxAppCode__['pages/problem/problem.wxml'] = $gwx( './pages/problem/problem.wxml' );
		__wxAppCode__['pages/set/set.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar","popup":"/component/popup/popup"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/set/set.wxml'] = [$gwx, './pages/set/set.wxml'];else __wxAppCode__['pages/set/set.wxml'] = $gwx( './pages/set/set.wxml' );
		__wxAppCode__['pages/test/test.json'] = {"usingComponents":{}};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/test/test.wxml'] = [$gwx, './pages/test/test.wxml'];else __wxAppCode__['pages/test/test.wxml'] = $gwx( './pages/test/test.wxml' );
		__wxAppCode__['pages/timing/timing.json'] = {"usingComponents":{"navbar":"/component/navbar/navbar"},"navigationStyle":"custom"};
		if (__vd_version_info__.delayedGwx) __wxAppCode__['pages/timing/timing.wxml'] = [$gwx, './pages/timing/timing.wxml'];else __wxAppCode__['pages/timing/timing.wxml'] = $gwx( './pages/timing/timing.wxml' );
	
	define("@babel/runtime/helpers/interopRequireDefault.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj
  };
}

module.exports = _interopRequireDefault; 
 			}); 
		define("@babel/runtime/helpers/typeof.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
function _typeof2(o){return(_typeof2="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(o){return typeof o}:function(o){return o&&"function"==typeof Symbol&&o.constructor===Symbol&&o!==Symbol.prototype?"symbol":typeof o})(o)}function _typeof(o){return"function"==typeof Symbol&&"symbol"===_typeof2(Symbol.iterator)?module.exports=_typeof=function(o){return _typeof2(o)}:module.exports=_typeof=function(o){return o&&"function"==typeof Symbol&&o.constructor===Symbol&&o!==Symbol.prototype?"symbol":_typeof2(o)},_typeof(o)}module.exports=_typeof; 
 			}); 
		define("utils/fundebug.1.6.0.min.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var e,t,n=require("../@babel/runtime/helpers/interopRequireDefault")(require("../@babel/runtime/helpers/typeof")),r=["networkType","__esModule","silentApp","forEach","callback","belong","url","sendToFundebug","has","symbol","name","prototype","function","http","onHide","notifierUrl","monitorMethodArguments","onLoad","indexOf","defineProperty","silent","options","metaData","type","getSystemInfo","silentConsole","onReady","exports","getEvent","silentBehavior","push","args","elapsedTime","entries","path","userInfo","iterator","default","silentHttpHeader","methodWhitelist","error","add","onShow","string","time","apply"];e=r,t=479,function(t){for(;--t;)e.push(e.shift())}(++t);var o=function(e,t){return r[e-=0]};module.exports=function(e){var t={};function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=e,r.c=t,r.d=function(e,t,n){var o={enumerable:!0};o.get=n,r.o(e,t)||Object.defineProperty(e,t,o)},r.r=function(e){var t={value:"Module"},n={value:!0};"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,t),Object[o("0x0")](e,"__esModule",n)},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==(0,n.default)(e)&&e&&e[o("0x1c")])return e;var i=Object.create(null),u={enumerable:!0};if(u.value=e,r.r(i),Object.defineProperty(i,"default",u),2&t&&"string"!=typeof e)for(var a in e)r.d(i,a,function(t){return e[t]}.bind(null,a));return i},r.n=function(e){var t=e&&e.__esModule?function(){return e[o("0x12")]}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,n){var r=n(1),o=n(11),i=n(12),u=n(13),a=n(14),c=n(15),s={},f=[],l={};s.init=r(l,f,s),s.test=o(l,f,s),s.notify=i(l,f,s),s.notifyError=u(l,f,s),s.notifyHttpError=a(l,f,s),s.set=c(l,f,s),e.exports=s},function(e,t,r){function i(e){return(i="function"==typeof Symbol&&"symbol"==(0,n.default)(Symbol.iterator)?function(e){return(0,n.default)(e)}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":(0,n.default)(e)})(e)}var u=r(2),a=r(8),c=r(9),s=r(10),f=r(7),l=!1;e.exports=function(e,t,n){return function(r){l=!0,r&&"object"===i(r)&&(["apikey","appVersion","releaseStage","metaData","filters","silent",o("0x13"),"monitorHttpData","httpTimeout","monitorMethodCall","monitorMethodArguments","methodWhitelist","setUserInfo","sampleRate",o("0xa"),o("0x1d"),"silentPage",o("0x1f"),o("0x2a"),"silentInject","silentConsole","monitorConsoleError","monitorResponse"].forEach((function(t){e[t]=r[t]})),r.notifierUrl||(e.notifierUrl="https://fundebug.com/wxjs/"),r[o("0x6")]||r[o("0xa")]||c(e,t,n),r.silentInject||r.silent||(u(e,t,n),a(e,t),r.silentHttp||s(e,t,n)),f.getNetworkType(),r.setSystemInfo&&f.getSystemInfo(),r.setLocation&&f.getLocation())}},setTimeout((function(){!1===l&&console.error("请使用fundebug.init(https://docs.fundebug.com/notifier/wxjs/api/init.html)配置apikey!")}),1e3)},function(e,t,n){var r=n(3),i=n(4),u=n(7);e.exports=function(e,t,n){var a={onLaunch:function(n){e.scene=n&&n.scene;var o={type:"function"};o.time=(new Date).getTime(),o.belong="App",o.method="onLaunch",o.path=n&&n.path,o.query=n&&n.query,o.scene=n&&n.scene;var i=o;r.captureBreadcrumb(t,i,e.silentBehavior)},onShow:function(n){e.scene=n&&n.scene;var i={type:"function"};i.time=(new Date).getTime(),i.belong="App",i.method=o("0x17"),i.path=n&&n[o("0xf")],i.query=n&&n.query,i.scene=n&&n.scene;var u=i;r.captureBreadcrumb(t,u,e.silentBehavior)},onHide:function(){var n={type:"function"};n[o("0x19")]=(new Date).getTime(),n.belong="App",n.method="onHide",n.route=e.currentPage&&e.currentPage.route,n.options=e.currentPage&&e.currentPage[o("0x2")];var i=n;r.captureBreadcrumb(t,i,e.silentBehavior)},onError:function(r){if(r){var a=u.getEvent(e,t,n);a.error=r,a.type="uncaught",i[o("0x22")](a,e)}}},c=a,s=App;App=function(e){Object.keys(c)[o("0x1e")]((function(t){var n,r,o,i;o=c[r=t],i=(n=e)[r],n[r]=function(){try{o.apply(this,arguments)}catch(e){console.error(e)}return i&&i.apply(this,arguments)}})),s(e)}}},function(e,t){t.captureBreadcrumb=function(e,t,n){n||(e[o("0xb")](t),20<e.length&&e.shift())},t.getCurrentPage=function(){var e=getCurrentPages();if(e.length)return e[e.length-1]},t.isSampled=function(e){return!e&&0!==e||(e=parseFloat(e),!!isNaN(e)||Math.random()<=e)}},function(e,t,r){var i=r(5),u=r(3),a=r(6),c=50,s=5;t.sendToFundebug=function(e,t){if(!t.silent&&(e.metaData=a.copyWithoutCircle(e[o("0x3")]),function(e){if(e.apikey)return!(!c||!s||(c--,s--,0));console.error("请使用fundebug.init(https://docs.fundebug.com/notifier/wxjs/api/init.html)配置apikey!")}(e))){if(t[o("0x1f")]&&o("0x27")==(0,n.default)(t.callback)){var r=Object.assign({},e);delete r.breadcrumbs,t.callback(r)}i.isFiltered(e,t.filters)||u.isSampled(t.sampleRate)&&wx.request({url:t[o("0x2a")],method:"POST",data:e,complete:function(){s++}})}}},function(e,t){function n(e,t){if(!e)return!1;if(!t)return!1;if(Object.keys&&!Object.keys(t).length)return!1;for(var r in t)if(t.hasOwnProperty(r))if(t[r].constructor===RegExp){if(!t[r].test(e[r]))return!1}else if(t[r].constructor===Object){if(!n(e[r],t[r]))return!1}else{if(t[r].constructor!==String||"inexistence"!==t[r])return!1;if(e.hasOwnProperty(r))return!1}return!0}t.isFiltered=function(e,t){if(!t||!t.length)return!1;for(var r=0;r<t.length;r++)if(n(e,t[r]))return!0;return!1}},function(e,t){function r(e){return(r="function"==typeof Symbol&&"symbol"==(0,n.default)(Symbol.iterator)?function(e){return(0,n.default)(e)}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":(0,n.default)(e)})(e)}var i=!1;try{var u=wx.getSystemInfoSync();"ios"===u.platform&&parseInt(u.system.match(/iOS (\d+)\./)[1])<11&&(i=!0)}catch(e){console.error(e)}t.copyWithoutCircle=function(e){return e&&"object"===r(e)&&function(e){try{JSON.stringify(e)}catch(e){return-1!==e.message.indexOf("Converting circular structure to JSON")||-1!==e.message[o("0x2d")]("JSON.stringify cannot serialize cyclic structures")}return!1}(e)?i?{}:function e(t,n){try{var i={};return Object[o("0xe")](t).forEach((function(t){var u=function(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if(Symbol[o("0x11")]in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e)){var n=[],r=!0,i=!1,u=void 0;try{for(var a,c=e[Symbol.iterator]();!(r=(a=c.next()).done)&&(n.push(a.value),!t||n.length!==t);r=!0);}catch(e){i=!0,u=e}finally{try{r||null==c.return||c.return()}finally{if(i)throw u}}return n}}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}(t,2),a=u[0],c=u[1];"object"===r(c)&&null!==c?n[o("0x23")](c)?i[a]="property removed because of circular structure":10<n.size?i[a]="property removed to avoid deep recursion":(n[o("0x16")](c),i[a]=e(c,n)):i[a]=c})),i}catch(e){return t}}(e,new Set([e])):e}},function(e,t,n){var r={notifierVersion:"1.6.0"},i=n(3),u=n(6),a=r;t[o("0x9")]=function(e,t,n){return a.scene=e.scene,a.apikey=e.apikey,a.appVersion=e.appVersion,a.releaseStage=e.releaseStage,a.metaData=n.metaData||e[o("0x3")],a.breadcrumbs=t,a[o("0x19")]=(new Date).getTime(),e.silentApp||(a.App=u.copyWithoutCircle(getApp())),e.silentPage||(a.Page=u.copyWithoutCircle(i.getCurrentPage())),a.userInfo||(n.userInfo?a.userInfo=n.userInfo:e.setUserInfo&&wx.getUserInfo({success:function(e){a.userInfo=e[o("0x10")]}})),a},t.getNetworkType=function(){var e={success:function(e){a.networkType=e[o("0x1b")]}};wx.getNetworkType(e)},t[o("0x5")]=function(){var e={success:function(e){a.systemInfo=e}};wx.getSystemInfo(e)},t.getLocation=function(){var e={type:"wgs84",success:function(e){a.locationInfo=e}};wx.getLocation(e)}},function(e,t,n){var r=n(3);e.exports=function(e,t){var n=["onLoad","onShow",o("0x7"),o("0x29"),"onUnload","onPullDownRefresh","onReachBottom","onShareAppMessage"];function i(i,u){var c=i[u];i[u]=function(){try{"onLoad"!==u&&"onShow"!==u||(e.currentPage=r.getCurrentPage());var i={type:"function"};i.time=(new Date).getTime(),i[o("0x20")]="Page",i.method=u,i.route=e.currentPage&&e.currentPage.route,i.options=e.currentPage&&e.currentPage.options;var s=i;o("0x2c")===u&&(s.args=arguments),e.monitorMethodArguments&&!a(n,u)&&(s[o("0xc")]=arguments),function(t){var n=e.methodWhitelist,r=e.methodBlacklist;return"onPageScroll"!==t&&(n&&n.length?Boolean(a(n,t)):!r||!r.length||Boolean(!a(r,t)))}(u)&&r.captureBreadcrumb(t,s,e.silentBehavior)}catch(i){console.error(i)}return c&&c.apply(this,arguments)}}var u=Page;function a(e,t){for(var n=0;n<e.length;n++)if(e[n]===t)return!0;return!1}Page=function(t){n.forEach((function(e){t[e]&&i(t,e)})),e.monitorMethodCall&&Object.keys(t).forEach((function(e){"function"!=typeof t[e]||a(n,e)||i(t,e)})),u(t)}}},function(e,t,n){var r=n(3),i=n(6),u=n(4),a=n(7);e.exports=function(e,t,n){["log","error","info","warn"].forEach((function(c){var s,f;s=c,f=console[s],console[s]=function(){try{var c={type:"console"};c.time=(new Date).getTime(),c.method=s,c.args=i.copyWithoutCircle(arguments);var l=c;r.captureBreadcrumb(t,l)}catch(c){console.error(c)}if(o("0x15")===s&&arguments[0]&&/^\[non-writable\] modification of global variable ".+" is not allowed when using plugins at app\.json\.$/.test(arguments[0]))f&&f[o("0x1a")](this,arguments),console.error("当使用小程序插件时，微信禁止Fundebug重写App/Page/wx等全局变量，请使用fundebug.init将silentInject(https://docs.fundebug.com/notifier/wxjs/customize/silentinject.html)设为true，并使用fundebug.notifyError(https://docs.fundebug.com/notifier/wxjs/api/notifyerror.html)上报onError捕获的错误。详情请查看Fundebug文档(https://docs.fundebug.com/notifier/wxjs/other/non_writable.html)");else{if(e.monitorConsoleError&&arguments[0]){var p=a.getEvent(e,t,n),m=arguments[0].stack;"{}"!=m&&""!=m&&null!=m&&(p.error=m,p.type="consoleError",u.sendToFundebug(p,e))}f&&f.apply(this,arguments)}}}))}},function(e,t,n){var r=n(3),i=n(4),u=n(7);e[o("0x8")]=function(e,t,n){var a=Object.assign({},wx),c=a.request;function s(a,c,s){var f=a[c];a[c]=function(){try{var c=arguments[0],l=function(t){var n={};n.url=t.url,n.data=t.data,n.header=t.header,n.method=t.method,n.dataType=t.dataType,n.responseType=t.responseType;var r=n;return e.silentHttpHeader&&delete r.header,e.monitorHttpData||delete r.data,r}(a),p=(new Date).getTime()-s;!function(r,a,c){if(function(t,n){if(!/^2\d\d$/.test(t))return!0;var r=e.httpTimeout;return"number"==typeof r&&r<n}(a.statusCode,c)){var s=u[o("0x9")](e,t,n);s.type="httpError",s.req=r,e.monitorResponse&&(s.res=a),s[o("0xd")]=c,i.sendToFundebug(s,e)}}(l,c,p),function(n,i,u,a){var c={};c.type=o("0x28"),c.time=u,c.req=n,c.elapsedTime=a;var s=c;e.monitorResponse&&(s.res=i),r.captureBreadcrumb(t,s,e.silentBehavior)}(l,c,s,p)}catch(c){console.error(c)}return f&&f.apply(this,arguments)}}Object.defineProperty(a,"request",{writable:!0,enumerable:!0,configurable:!0,value:function(e){try{if(e&&!/fundebug\.com/.test(e[o("0x21")])){var t=(new Date).getTime();s(e,"success",t),s(e,"fail",t)}}catch(e){console.error(e)}return c(e)}}),wx=a}},function(e,t,n){var r=n(4),i=n(7);e.exports=function(e,t,n){return function(u,a){try{if(e.silent)return;if(u&&"string"!=typeof u)return void console.error("fundebug.test()的name参数类型必须为string!");if(a&&"string"!=typeof a)return void console[o("0x15")]("fundebug.test()的message参数类型必须为string!");var c=i.getEvent(e,t,n);c.type="test",c.name=u||"Test",c.message=a||"Hello, Fundebug!",r.sendToFundebug(c,e)}catch(u){console[o("0x15")](u)}}}},function(e,t,r){function i(e){return(i="function"==typeof Symbol&&"symbol"==(0,n.default)(Symbol.iterator)?function(e){return(0,n.default)(e)}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":(0,n.default)(e)})(e)}var u=r(4),a=r(7);e.exports=function(e,t,r){return function(c,s,f){try{if(e[o("0x1")])return;if(!c)return void console.error("fundebug.notify()必须指定name参数!");if("string"!=typeof c)return void console.error("fundebug.notify()的name参数类型必须为string!");if(s&&o("0x18")!=(0,n.default)(s))return void console.error("fundebug.notify()的message参数类型必须为string!");if(f&&"object"!==i(f))return void console.error("fundebug.notify()的option参数类型必须为object!");var l=a.getEvent(e,t,r);l.type="notification",l.name=c,l.message=s,f&&f.metaData&&(l.metaData=f.metaData),u.sendToFundebug(l,e)}catch(c){console.error(c)}}}},function(e,t,r){function i(e){return(i="function"==typeof Symbol&&"symbol"==(0,n.default)(Symbol.iterator)?function(e){return(0,n.default)(e)}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":(0,n.default)(e)})(e)}var u=r(4),a=r(7);e.exports=function(e,t,n){return function(r,c){try{if(e.silent)return;if(!r)return void console.error("fundebug.notifyError()必须指定error参数!");if(c&&"object"!==i(c))return void console.error("fundebug.notifyError()的option参数类型必须为object!");var s=a.getEvent(e,t,n);r instanceof Error?s.error={name:r[o("0x25")],message:r.message,stack:r.stack}:s.error=r,s[o("0x4")]="caught",c&&(c.name&&(s.name=c.name),c.metaData&&(s.metaData=c.metaData)),u.sendToFundebug(s,e)}catch(r){console.error(r)}}}},function(e,t,r){function i(e){return(i="function"==typeof Symbol&&"symbol"==(0,n.default)(Symbol.iterator)?function(e){return(0,n.default)(e)}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":(0,n.default)(e)})(e)}var u=r(4),a=r(7);e.exports=function(e,t,n){return function(r,c,s){try{if(e.silent)return;if(!r)return void console.error("fundebug.notifyHttpError()必须指定req参数!");if(!c)return void console.error("fundebug.notifyHttpError()必须指定res参数!");if(r&&"object"!==i(r))return void console.error("fundebug.notifyHttpError()的req参数类型必须为object!");if(c&&"object"!==i(c))return void console[o("0x15")]("fundebug.notifyHttpError()的res参数类型必须为object!");if(s&&"object"!==i(s))return void console[o("0x15")]("fundebug.notifyHttpError()的option参数类型必须为object!");var f=a.getEvent(e,t,n);f.type="httpError",f.req=r,f.res=c,s&&s.metaData&&(f.metaData=s.metaData),u.sendToFundebug(f,e)}catch(r){console.error(r)}}}},function(e,t){function r(e){return(r="function"==typeof Symbol&&o("0x24")==(0,n.default)(Symbol.iterator)?function(e){return(0,n.default)(e)}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol[o("0x26")]?"symbol":(0,n.default)(e)})(e)}e[o("0x8")]=function(e,t,n){return function(t){t&&"object"===r(t)&&["appVersion","releaseStage","metaData","filters","silent",o("0x13"),"monitorHttpData","httpTimeout","monitorMethodCall",o("0x2b"),o("0x14"),"setUserInfo","sampleRate","silentBehavior","silentApp","silentPage","callback","silentResponse","monitorConsoleError","monitorResponse"].forEach((function(n){null!=t[n]&&(e[n]=t[n])}))}}}]); 
 			}); 
		define("utils/request.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var e=require("../@babel/runtime/helpers/interopRequireDefault")(require("../@babel/runtime/helpers/typeof"));function t(t,n,o,r,u){return u||r||"function"!=typeof o?u||("function"==typeof o?(u=r,r=o,o=""):"object"===(0,e.default)(o)||console.log("传递参数类型不正确")):(r=o,o=""),wx.request({url:"https://api.sh-lifefun.cn"+t,header:{"content-type":"application/json"},method:n,data:o,success:function(e){console.log(e.data.code),r(e.data)},fail:function(e){console.log(e),u&&u(e)}})}exports.Get=function(e,n,o,r){return t(e,"GET",n,o,r)},exports.Post=function(e,n,o,r){return t(e,"POST",n,o,r)},exports.Delete=function(e,n,o,r){return t(e,"DELETE",n,o,r)}; 
 			}); 
		define("utils/util.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var t=function(t){return(t=t.toString())[1]?t:"0".concat(t)};module.exports={formatTime:function(e){var n=e.getFullYear(),o=e.getMonth()+1,r=e.getDate(),a=e.getHours(),c=e.getMinutes(),u=e.getSeconds();return"".concat([n,o,r].map(t).join("/")," ").concat([a,c,u].map(t).join(":"))}}; 
 			}); 
		define("app.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";require("utils/request");require("utils/fundebug.1.6.0.min.js").init({apikey:"5f4d0c2d649ff889d02636ae619ab6e5fc652e924d438b5cc22a256267e498ff",setSystemInfo:!0,silentConsole:!1,silentHttp:!0}),App({onLaunch:function(t){var e=this;this.globalData.sysinfo=wx.getSystemInfoSync();var s=wx.getStorageSync("logs")||[];s.unshift(Date.now()),wx.setStorageSync("logs",s),wx.getSystemInfo({success:function(t){e.globalData.SystemInfo=t,e.globalData.height=t.statusBarHeight,e.globalData.system=t.system.split(" ")[0]}})},globalData:{userInfo:null,share:!1,height:"",system:""}}); 
 			}); 	require("app.js");
 		__wxRoute = 'component/blepop/blepop';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'component/blepop/blepop.js';	define("component/blepop/blepop.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";Component({options:{multipleSlots:!0},properties:{},data:{flag:!0},methods:{hidePopup:function(){this.setData({flag:!this.data.flag})},showPopup:function(){this.setData({flag:!this.data.flag})},_closebt:function(){this.triggerEvent("closebt")},_openbt:function(){this.triggerEvent("openbt")}}}); 
 			}); 	require("component/blepop/blepop.js");
 		__wxRoute = 'component/inputPop/inputPop';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'component/inputPop/inputPop.js';	define("component/inputPop/inputPop.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";Component({options:{multipleSlots:!0},properties:{title:{type:String,value:"标题"},devicename:{type:String,value:""},btn_cancel:{type:String,value:"取消"},btn_confirm:{type:String,value:"确定"}},data:{flag:!0},methods:{hidePopup:function(){this.setData({flag:!this.data.flag})},showPopup:function(){this.setData({flag:!this.data.flag})},_clear:function(){this.triggerEvent("clear")},_cancel:function(){this.triggerEvent("cancel")},_confirm:function(){this.triggerEvent("confirm")}}}); 
 			}); 	require("component/inputPop/inputPop.js");
 		__wxRoute = 'component/navbar/navbar';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'component/navbar/navbar.js';	define("component/navbar/navbar.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var a=getApp();Component({properties:{navbarData:{type:Object,value:{},observer:function(a,t){}}},data:{height:"",hiddenExplain:!0,navbarData:{showCapsule:1,showpop:!1}},attached:function(){this.setData({share:a.globalData.share}),this.setData({height:a.globalData.height})},methods:{_navback:function(){wx.navigateBack()},_backhome:function(){wx.navigateBack()},_showtextpop:function(){console.log(this),this.setData({hiddenExplain:!this.data.hiddenExplain})}}}); 
 			}); 	require("component/navbar/navbar.js");
 		__wxRoute = 'component/popup/popup';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'component/popup/popup.js';	define("component/popup/popup.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";Component({options:{multipleSlots:!0},properties:{title:{type:String,value:"标题"},content:{type:String,value:"内容"},btn_no:{type:String,value:"取消"},btn_ok:{type:String,value:"确定"}},data:{popFlag:!0},methods:{hidePopup:function(){this.setData({popFlag:!this.data.popFlag})},showPopup:function(){this.setData({popFlag:!this.data.popFlag})},_error:function(){this.triggerEvent("error")},_success:function(){this.triggerEvent("success")}}}); 
 			}); 	require("component/popup/popup.js");
 		__wxRoute = 'component/timepop/timepop';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'component/timepop/timepop.js';	define("component/timepop/timepop.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";Component({options:{multipleSlots:!0},properties:{timeData:{type:Number,value:""},title:{type:String,value:"标题"},btn_cancel:{type:String,value:"取消"}},data:{flag:!0,timelist:[3,4,5,6,7,8,9,10],timeData:{time:""}},methods:{radioChange:function(t){this.setData({timeData:{time:t.detail.value},flag:!this.data.flag})},hidePopup:function(){this.setData({flag:!this.data.flag})},showPopup:function(){this.setData({flag:!this.data.flag})},_cancel:function(){this.triggerEvent("cancel")},_success:function(){this.triggerEvent("success")}}}); 
 			}); 	require("component/timepop/timepop.js");
 		__wxRoute = 'pages/init/init';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/init/init.js';	define("pages/init/init.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var o=require("../../utils/request");Page({data:{code:"",rd_session:""},onLoad:function(n){var e=wx.getStorageSync("deviceId"),s=this;wx.login({success:function(n){var t=n.code;s.setData({code:t}),console.log(t);var i={code:t};o.Get("/wx_mini/v1/user/get_3rd_session",i,(function(n){var t={rd_session:n.data.rd_session};s.setData({rd_session:n.data.rd_session}),wx.setStorageSync("session",n.data.rd_session),console.log(t),o.Get("/wx_mini/v1/user/get_user_info",t,(function(o){console.log(o),""==o.data?s.regOrLogin(t):(console.log("已注册"),setTimeout((function(){""==e?wx.redirectTo({url:"../conble/conble"}):wx.redirectTo({url:"../index/index?deviceId="+e})}),2e3))}),(function(o){console.log(o)}))}),(function(o){console.log(o)})),o.Get("/wx_mini/v1/user/get_access_token",(function(o){console.log(o)}))}})},regOrLogin:function(n){var e=this;wx.showModal({title:"温馨提示",content:"正在请求您的个人信息",success:function(n){if(n.confirm)wx.getUserProfile({desc:"获取你的昵称、头像、地区及性别",success:function(n){wx.setStorageSync("UserInfo",n.userInfo);var s={rd_session:e.data.rd_session,nickname:n.userInfo.nickname,gender:n.userInfo.gender,city:n.userInfo.city,province:n.userInfo.province,country:n.userInfo.country,avatarUrl:n.userInfo.avatarUrl};o.Get("/wx_mini/v1/user/regist_update_user",s,(function(o){setTimeout((function(){wx.navigateTo({url:"../conble/conble"})}),1e3)}),(function(o){console.log(o)}))},fail:function(o){e.showErrorModal("您拒绝了请求")}});else if(n.cancel)return void e.showErrorModal("您拒绝了请求")}})},onReady:function(){},onShow:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/init/init.js");
 		__wxRoute = 'pages/conble/conble';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/conble/conble.js';	define("pages/conble/conble.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var e=getApp(),t=require("../../utils/request");Page({data:{height:2*e.globalData.height+20,h:e.globalData.height,system:e.globalData.system,systemInfo:e.globalData.SystemInfo,list:[],listIsEmpty:!0,isSearch:!1,BlueToothAdapter:!1,BlueAdapter:!1,BlueToothDiscovery:!1,searchTimeout:""},onLoad:function(){this.openBluetoothAdapter()},onShow:function(){this.onBluetoothAdapterStateChange()},onReady:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){},openBluetoothAdapter:function(){var e=this;wx.openBluetoothAdapter({success:function(t){e.setData({BlueToothAdapter:!0}),e.startBluetoothDevicesDiscovery()},fail:function(e){console.log(e),console.log("适配器初始化失败 提示打开蓝牙")}})},onBluetoothAdapterStateChange:function(){var e=this;wx.onBluetoothAdapterStateChange((function(t){!t.available||t.discovering||e.data.isSearch||""!=e.data.searchTimeout?t.available||(e.setData({BlueToothAdapter:!1,isSearch:!1,searchTimeout:""}),e.stopBluetoothDevicesDiscovery()):(e.setData({BlueToothAdapter:!0}),e.startBluetoothDevicesDiscovery()),e.setData({BlueAdapter:t.available,BlueToothDiscovery:t.discovering})}))},startBluetoothDevicesDiscovery:function(){var e=this,o=this;wx.startBluetoothDevicesDiscovery({services:["00001812-0000-1000-8000-00805F9B34FB"],success:function(t){o.setData({isSearch:!0}),o.setData({searchTimeout:setTimeout((function(){o.stopBluetoothDevicesDiscovery()}),6e4)}),setTimeout((function(){e.getBluetoothDevices(),e.onBluetoothDeviceFound()}),2e3)},fail:function(o){console.error(o),console.log(e.data.systemInfo);var a={rd_session:wx.getStorageSync("session"),mobile_info_json:{mobile_info:e.data.systemInfo,locationEnabled:e.data.systemInfo.locationEnabled,bluetoothEnabled:e.data.systemInfo.bluetoothEnabled,errMsg:o}};t.Get("/wx_mini/v1/user/uploads_user_mobile_info",a,(function(e){console.log(e)}),(function(e){console.log(e)}))}})},stopBluetoothDevicesDiscovery:function(){var e=this;return new Promise((function(o,a){wx.stopBluetoothDevicesDiscovery({success:function(a){if(o(a),e.setData({isSearch:!1}),0==e.data.list.length){var i={rd_session:wx.getStorageSync("session"),mobile_info_json:{mobile_info:e.data.systemInfo,locationEnabled:e.data.systemInfo.locationEnabled,bluetoothEnabled:e.data.systemInfo.bluetoothEnabled}};t.Get("/wx_mini/v1/user/uploads_user_mobile_info",i,(function(e){console.log(e)}),(function(e){console.log(e)}))}clearInterval(e.data.searchTimeout)}})}))},getBluetoothDevices:function(){var e=this;wx.getBluetoothDevices({success:function(t){if("iOS"==e.data.system)for(var o=0;o<t.devices.length;o++)"QUANGE-WY020702"==t.devices[o].localName&&(t.devices[o].IosdeviceId=e.jiequ(e.ab2hex(t.devices[o].advertisData),2),e.setData({list:e.data.list.concat(t.devices[o])}));else for(var a=0;a<t.devices.length;a++)"QUANGE-WY020702"==t.devices[a].localName&&e.setData({list:e.data.list.concat(t.devices[a])});0!=e.data.list.length&&e.setData({listIsEmpty:!1})}})},onBluetoothDeviceFound:function(){var e=this;wx.onBluetoothDeviceFound((function(t){var o=e.data.list;t.devices.map((function(t){o.find((function(e){return e.deviceId==t.deviceId}))||"QUANGE-WY020702"!=t.localName||((e.data.system="iOS")&&(t.IosdeviceId=e.jiequ(e.ab2hex(t.advertisData),2)),o.push(t),e.setData({list:o}))})),0!=e.data.list.length&&e.setData({listIsEmpty:!1}),setTimeout((function(){e.setData({list:e.data.list.sort(e.compare("RSSI"))})}),5e3)}))},clickSearch:function(){this.startBluetoothDevicesDiscovery()},openBluetoothAdapterTimeout:function(){},ab2hex:function(e){return Array.prototype.map.call(new Uint8Array(e),(function(e){return("00"+e.toString(16)).slice(-2)})).join("")},bindViewTap:function(e){var t=this;t.stopBluetoothDevicesDiscovery().then((function(o){var a=e.currentTarget.dataset.title,i=e.currentTarget.dataset.name;if("iOS"==t.data.system){var s=e.currentTarget.dataset.iosid;wx.redirectTo({url:"../index/index?deviceId="+a+"&name="+i+"&IosId="+s})}else wx.redirectTo({url:"../index/index?deviceId="+a+"&name="+i})}))},jiequ:function(e,t){for(var o=[],a=0,i=e.length;a<i/t;a++){var s=e.slice(t*a,t*(a+1));o.push(s.toUpperCase())}return o.join(":")},compare:function(e){return function(t,o){var a=t[e];return o[e]-a}}}); 
 			}); 	require("pages/conble/conble.js");
 		__wxRoute = 'pages/history/history';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/history/history.js';	define("pages/history/history.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var t=require("../../utils/request"),a=getApp();Page({data:{height:2*a.globalData.height+20,width:"",navbarData:{showCapsule:1,title:"历史记录"},idx:1,changeIdx:0,tit:[{title:"日",id:1},{title:"周",id:2},{title:"月",id:3}],timearr:[12,9,6,3,0],Wtimearr:[48,36,24,12,0],Mtimearr:[48,36,24,12,0],Dmax:12,Wmax:48,Mmax:48,sjd:["00:00","06:00","12:00","18:00","24:00"],day:[],dayList:[],week:[],month:[],monthtitDate:"",monthtitTiming:"",Ddatetime:"",nowDate:"",nowtime:"累计消杀",timing:"0分钟",dateData:"",weekList:[],weektimesList:[],weekTiming:"",weekbottom:[],MonthTiming:"00",weekDate:"",monthData:"",monthNum:"",monthDayNum:"",monthbottom:[],monthtit:"",monthList:[],dDeviation:0,wDeviation:0,mDeviation:0},titChangeIdx:function(t){var a=Math.round((new Date).getTime()),e=this.formatDate(a),i=Date.now();this.daysOfThisWeek(i),this.getData(),this.setData({idx:t.currentTarget.dataset.index,changeIdx:0,nowtime:"累计消杀",timing:"0分钟",Ddatetime:e,timearr:[12,9,6,3,0],Wtimearr:[48,36,24,12,0],Mtimearr:[48,36,24,12,0],Dmax:12,Wmax:48,Mmax:48,dDeviation:0,wDeviation:0,mDeviation:0}),this.getLogData()},DateL:function(){var t=this.data.nowDate-864e5,a=this.formatDate(t);this.setData({dDeviation:this.data.dDeviation-1,day:[],dayList:[],changeIdx:0,nowtime:"累计消杀",timearr:[12,9,6,3,0],Dmax:12,Wmax:48,Mmax:48,nowDate:this.data.nowDate-864e5,Ddatetime:a}),this.getLogData()},DateR:function(){var t=this.data.nowDate+864e5,a=this.formatDate(t);this.data.dDeviation<0&&(this.setData({dDeviation:this.data.dDeviation+1,changeIdx:0,nowtime:"累计消杀",timearr:[12,9,6,3,0],Dmax:12,Wmax:48,Mmax:48,day:[],dayList:[],nowDate:this.data.nowDate+864e5,Ddatetime:a}),this.getLogData())},WDateL:function(){this.setData({wDeviation:this.data.wDeviation-1,weekDate:"",weekTiming:"",Wtimearr:[48,36,24,12,0],Dmax:12,Wmax:48,Mmax:48,changeIdx:0,nowtime:"累计消杀",week:"",weekbottom:[]}),this.getLogData();var t=this.data.weekdatetime-6048e5;this.daysOfThisWeek(t)},WDateR:function(){var t=this.data.weekdatetime+6048e5;console.log(this.data.wDeviation),this.data.wDeviation<0&&(this.setData({wDeviation:this.data.wDeviation+1,weekDate:"",weekTiming:"",changeIdx:0,Wtimearr:[48,36,24,12,0],Dmax:12,Wmax:48,Mmax:48,nowtime:"累计消杀",week:"",weekbottom:[]}),this.getLogData(),this.daysOfThisWeek(t))},MDateL:function(){this.setData({mDeviation:this.data.mDeviation-1,month:"",changeIdx:0,nowtime:"累计消杀",timing:"0分钟",Mtimearr:[48,36,24,12,0],Dmax:12,Wmax:48,Mmax:48,monthtit:"",monthbottom:[]}),this.getLogData();var t=this.data.dateData;t=t.setMonth(t.getMonth()-1);var a=(t=new Date(t)).getFullYear(),e=t.getMonth()+1,i=a+"年"+e+"月",n=[e+"/5",e+"/12",e+"/19",e+"/26"];this.setData({monthData:i,monthList:n,monthNum:e})},MDateR:function(){var t=(new Date).getMonth()+1;if(console.log(t),this.data.monthNum<t){this.setData({mDeviation:this.data.mDeviation+1,weekDate:"",changeIdx:0,timing:"0分钟",Mtimearr:[48,36,24,12,0],Dmax:12,Wmax:48,Mmax:48,nowtime:"累计消杀",monthbottom:[],month:"",monthtit:""}),this.getLogData();var a=this.data.dateData;console.log(a),a=a.setMonth(a.getMonth()+1);var e=(a=new Date(a)).getFullYear(),i=a.getMonth()+1,n=e+"年"+i+"月",o=[i+"/5",i+"/12",i+"/19",i+"/26"];this.setData({monthData:n,monthList:o,monthNum:i})}},daysOfThisWeek:function(t){var a=((new Date).getDay()+7-1)%7,e=Array.from(new Array(7)).map((function(e,i){var n=new Date(t+1e3*(i-a)*60*60*24);return n.getFullYear()+"年"+String(n.getMonth()+1)+"月"+String(n.getDate())+"日"})),i=Array.from(new Array(7)).map((function(e,i){var n=new Date(t+1e3*(i-a)*60*60*24);return String(n.getMonth()+1)+"/"+String(n.getDate())}));this.setData({weekList:e,weekdatetime:t,weektimesList:i})},click:function(t){console.log(t),this.setData({changeIdx:t.currentTarget.dataset.value.id,nowtime:t.currentTarget.dataset.value.date,timing:this.data.dayList[t.currentTarget.dataset.value.id-1].timing})},weekclick:function(t){var a=t.currentTarget.dataset.value.id;console.log(t),this.setData({nowtime:t.currentTarget.dataset.value.time_date,changeIdx:a,timing:t.currentTarget.dataset.value.time,weekDate:this.data.weektimesList[a-1]})},monthclick:function(t){console.log(t),this.setData({monthDayNum:t.currentTarget.dataset.value.id,nowtime:t.currentTarget.dataset.value.time_date,timing:t.currentTarget.dataset.value.time,changeIdx:t.currentTarget.dataset.value.id})},getData:function(){var t=this,a=new Date,e=a.getFullYear(),i=a.getMonth()+1,n=a.getDate(),o=e+"年"+i+"月"+n+"日",s=e+"年"+i+"月",r=[i+"/5",i+"/12",i+"/19",i+"/26"];t.setData({datetime:o,dateData:a,monthData:s,monthList:r,monthNum:i,monthDayNum:n});var m=Date.now();t.daysOfThisWeek(m),wx.getSystemInfo({success:function(a){t.setData({width:a.windowWidth})}})},onLoad:function(t){this.getData(),this.getLogData();var a=Math.round((new Date).getTime()),e=this.formatDate(a);this.setData({monthtit:this.data.monthNum+"月"+this.data.monthDayNum+"日",nowDate:a,Ddatetime:e}),wx.getStorage({key:"logDataList",success:function(t){}})},formatDate:function(t){return(t=new Date(t)).getFullYear()+"年"+((t.getMonth()+1<10?"0"+(t.getMonth()+1):t.getMonth()+1)+"月")+((t.getDate()<10?"0"+t.getDate():t.getDate())+"日")},onReady:function(){},getLogData:function(){var a=this;if(1==a.data.idx)e={rd_session:wx.getStorageSync("session"),mac:wx.getStorageSync("deviceId"),log_type:a.data.idx,date_value:a.data.dDeviation};else if(2==a.data.idx)e={rd_session:wx.getStorageSync("session"),mac:wx.getStorageSync("deviceId"),log_type:a.data.idx,date_value:a.data.wDeviation};else var e={rd_session:wx.getStorageSync("session"),mac:wx.getStorageSync("deviceId"),log_type:a.data.idx,date_value:a.data.mDeviation};t.Get("/wx_mini/v1/device/get_device_use_log",e,(function(t){console.log(t.data.list);for(var e=0,i=0;i<t.data.list.length;i++)e+=t.data.list[i].continuous;1==a.data.idx?(a.setData({day:a.toDayList(t.data.list),datetime:t.data.list.time_title,dayList:a.toDayLogList(t.data.list),timing:a.toMS(e)}),a.DaySjd(t.data.list)):2==a.data.idx?(0==a.toWeekList(t.data.list).length?a.setData({weekDate:"",weekTiming:"",timing:a.toMS(e)}):a.setData({week:a.toWeekList(t.data.list),weekbottom:a.toWeekList(t.data.list).reverse(),weekDate:a.toWeekList(t.data.list).reverse()[0].time_date,timing:a.toMS(e)}),a.weekSjd(t.data.list)):(0==a.toMonthList(t.data.list).length||a.setData({month:a.toMonthList(t.data.list),monthbottom:a.toMonthList(t.data.list).reverse(),monthtit:a.toMonthList(t.data.list).reverse()[0].time_date,timing:a.toMS(e)}),a.MonthSjd(t.data.list))}),(function(t){console.log(t)}))},toDayList:function(t){for(var a=[],e=0;e<t.length;e++)a[e]={id:e+1,date:t[e].start_time.split(" ")[1].split(":")[0]+":"+t[e].start_time.split(" ")[1].split(":")[1],timing:Math.round(t[e].continuous/60),m:60*Number(t[e].start_time.split(" ")[1].split(":")[0])+Number(t[e].start_time.split(" ")[1].split(":")[1]),type:t[e].action_type};return a},toDayLogList:function(t){for(var a=[],e=0;e<t.length;e++)a[e]={id:e+1,date:t[e].start_time.split(" ")[1].split(":")[0]+":"+t[e].start_time.split(" ")[1].split(":")[1],timing:this.toMS(t[e].continuous),m:60*Number(t[e].start_time.split(" ")[1].split(":")[0])+Number(t[e].start_time.split(" ")[1].split(":")[1]),type:t[e].action_type};return a},toWeekList:function(t){for(var a=[],e=0,i=0;i<t.length;i++)0!=t[i].continuous&&(a[e]={id:i+1,timing:Math.round(t[i].continuous/60),time:this.toMS(t[i].continuous),time_date:this.toDate(t[i].start_time)},e++);return a},DaySjd:function(t){var a=this.toDayList(t);console.log(a);var e=a.sort(this.compare("timing"));console.log(e);var i=e[0].timing;if(console.log(i),i>12){var n=i/4;(t=[])[0]=e[0].timing+1,t[1]=Math.round(3*n),t[2]=Math.round(2*n),t[3]=Math.round(1*n),t[4]=0,this.setData({timearr:t,Dmax:i})}},weekSjd:function(t){var a=this.toWeekList(t).sort(this.compare("timing"));console.log(a);var e=a[0].timing;if(console.log(e),e>48){var i=e/4;(t=[])[0]=a[0].timing+1,t[1]=Math.round(3*i),t[2]=Math.round(2*i),t[3]=Math.round(1*i),t[4]=0,this.setData({Wtimearr:t,Wmax:e})}},MonthSjd:function(t){var a=this.toMonthList(t).sort(this.compare("timing"));console.log(a);var e=a[0].timing;if(console.log(e),e>48){var i=e/4;(t=[])[0]=a[0].timing+1,t[1]=Math.round(3*i),t[2]=Math.round(2*i),t[3]=Math.round(1*i),t[4]=0,this.setData({Mtimearr:t,Mmax:e})}},compare:function(t){return function(a,e){var i=a[t];return e[t]-i}},toMonthList:function(t){for(var a=[],e=0,i=0;i<t.length;i++)0!=t[i].continuous&&(a[e]={id:i+1,timing:Math.round(t[i].continuous/60),time:this.toMS(t[i].continuous),time_date:this.toDate(t[i].start_time)},e++);return console.log(a),a},toMS:function(t){return t%60==0?t/60+"分钟":t/60<1?t%60+"秒":t/60>1?parseInt(t/60)+"分"+t%60+"秒":void 0},toDate:function(t){var a=t.split("/");return Number(a[1])+"月"+Number(a[0])+"日"},onShow:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/history/history.js");
 		__wxRoute = 'pages/test/test';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/test/test.js';	define("pages/test/test.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";getApp();function e(e,t,c){for(var i=0;i<e.length;i++)if(e[i][t]===c)return i;return-1}function t(e){return Array.prototype.map.call(new Uint8Array(e),(function(e){return("00"+e.toString(16)).slice(-2)})).join("")}Page({data:{devices:[],connected:!1,chs:[],inputValue:""},openBluetoothAdapter:function(){var e=this;wx.openBluetoothAdapter({success:function(t){console.log("openBluetoothAdapter success",t),e.startBluetoothDevicesDiscovery()},fail:function(e){10001===e.errCode&&wx.onBluetoothAdapterStateChange((function(e){console.log("onBluetoothAdapterStateChange",e),e.available&&this.startBluetoothDevicesDiscovery()}))}})},getBluetoothAdapterState:function(){var e=this;wx.getBluetoothAdapterState({success:function(t){console.log("getBluetoothAdapterState",t),t.discovering?e.onBluetoothDeviceFound():t.available&&e.startBluetoothDevicesDiscovery()}})},startBluetoothDevicesDiscovery:function(){var e=this;this._discoveryStarted||(this._discoveryStarted=!0,wx.startBluetoothDevicesDiscovery({allowDuplicatesKey:!0,success:function(t){console.log("startBluetoothDevicesDiscovery success",t),e.onBluetoothDeviceFound()}}))},stopBluetoothDevicesDiscovery:function(){wx.stopBluetoothDevicesDiscovery()},onBluetoothDeviceFound:function(){var t=this;wx.onBluetoothDeviceFound((function(c){c.devices.forEach((function(c){if(c.name||c.localName){var i=t.data.devices,a=e(i,"deviceId",c.deviceId),o={};-1===a?o["devices[".concat(i.length,"]")]=c:o["devices[".concat(a,"]")]=c,t.setData(o)}}))}))},createBLEConnection:function(e){var t=this,c=this,i=e.currentTarget.dataset,a=i.deviceId,o=i.name;this.stopBluetoothDevicesDiscovery(),wx.createBLEConnection({deviceId:a,success:function(e){wx.onBLEConnectionStateChanged((function(e){console.log(e)})),wx.notifyBLECharacteristicValueChange({characteristicId:"00001002-0000-1000-8000-00805F9B34FB",deviceId:"AE:C1:38:6E:5F:13",serviceId:"000000FB-0000-1000-8000-00805F9B34FB",state:!0,success:function(e){wx.onBLECharacteristicValueChange((function(e){console.log("特征值变化:"+c.buf2hex(e.value))}))}}),t.setData({connected:!0,name:o,deviceId:a}),t.getBLEDeviceServices(a)}})},buf2hex:function(e){return Array.prototype.map.call(new Uint8Array(e),(function(e){return("00"+e.toString(16)).slice(-2)})).join("")},closeBLEConnection:function(){wx.closeBLEConnection({deviceId:this.data.deviceId,success:function(){wx.closeBluetoothAdapter({success:function(e){console.log(e)}})}}),this.setData({connected:!1,chs:[],canWrite:!1})},getBLEDeviceServices:function(e){var t=this;wx.getBLEDeviceServices({deviceId:e,success:function(c){for(var i=0;i<c.services.length;i++)if(c.services[i].isPrimary)return void t.getBLEDeviceCharacteristics(e,c.services[i].uuid)}})},getBLEDeviceCharacteristics:function(c,i){var a=this;wx.getBLEDeviceCharacteristics({deviceId:c,serviceId:i,success:function(e){console.log("getBLEDeviceCharacteristics success",e.characteristics);for(var t=0;t<e.characteristics.length;t++){var o=e.characteristics[t];o.properties.read&&wx.readBLECharacteristicValue({deviceId:c,serviceId:i,characteristicId:o.uuid}),o.properties.write&&(a.setData({canWrite:!0}),a._deviceId=c,a._serviceId=i,a._characteristicId=o.uuid,a.writeBLECharacteristicValue()),(o.properties.notify||o.properties.indicate)&&wx.notifyBLECharacteristicValueChange({deviceId:c,serviceId:i,characteristicId:o.uuid,state:!0})}},fail:function(e){console.error("getBLEDeviceCharacteristics",e)}}),wx.onBLECharacteristicValueChange((function(c){var i=e(a.data.chs,"uuid",c.characteristicId),o={};-1===i?o["chs[".concat(a.data.chs.length,"]")]={uuid:c.characteristicId,value:t(c.value)}:o["chs[".concat(i,"]")]={uuid:c.characteristicId,value:t(c.value)},a.setData(o)}))},writeBLECharacteristicValue:function(){var e=new ArrayBuffer(1);new DataView(e).setUint8(0,255*Math.random()|0),wx.writeBLECharacteristicValue({deviceId:this._deviceId,serviceId:this._serviceId,characteristicId:this._characteristicId,value:e})},closeBluetoothAdapter:function(){wx.closeBluetoothAdapter(),this._discoveryStarted=!1},writeBle:function(e){var t=new Uint8Array(e.match(/[\da-f]{2}/gi).map((function(e){return parseInt(e,16)}))).buffer;wx.writeBLECharacteristicValue({deviceId:"AE:C1:38:6E:5F:13",serviceId:"000000FB-0000-1000-8000-00805F9B34FB",characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:t,success:function(e){console.log("success  指令发送成功"),console.log(e)},fail:function(e){console.log(e)}})},bindKeyInput:function(e){this.setData({inputValue:e.detail.value})},getState:function(){var e=Date.parse(new Date),t="DB0402"+(e=(e/1e3).toString(16));this.writeBle(t)},EditKill:function(){console.log(this.data.inputValue);var e=this.data.inputValue;this.writeBle(e)},startKill:function(){this.writeBle("DB020401")},stopKill:function(){this.writeBle("DB020400")}}); 
 			}); 	require("pages/test/test.js");
 		__wxRoute = 'pages/set/set';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/set/set.js';	define("pages/set/set.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var e=getApp(),t=require("../../utils/request");Page({data:{deviceId:"",height:2*e.globalData.height+20,system:e.globalData.system,navbarData:{showCapsule:1,title:"设置"},flag:!0,deviceName:"",inputValue:"",keyboradHeight:0},showInfo:function(){wx.navigateTo({url:"/pages/deviceInfo/deviceInfo"})},onLoad:function(e){var t=this;wx.getStorage({key:"deviceId",success:function(e){t.setData({deviceId:e.data})},fail:function(e){},complete:function(e){}})},onReady:function(){this.popup=this.selectComponent("#popup"),this.Delpopup=this.selectComponent("#Delpopup")},onHandleFocus:function(e){console.log("focus",e),this.setData({keyboradHeight:e.detail.height})},onBlur:function(){this.setData({keyboradHeight:0})},hidePopup:function(){this.popup.hidePopup()},DelhidePopup:function(){this.Delpopup.hidePopup()},DelshowPopup:function(){this.Delpopup.showPopup()},_errorDel:function(){this.DelhidePopup()},_successDel:function(){this.DelhidePopup(),this.delDevice()},showPopup:function(){console.log("显示弹窗"),this.popup.showPopup()},_error:function(){console.log("你点击了取消"),this.hidePopup()},_success:function(){var e=this,o=wx.getSystemInfoSync().SDKVersion,n={mac:e.data.deviceId},i=wx.getStorageSync("serviceId"),c=wx.getStorageSync("deviceId");wx.removeStorageSync("clearList"),t.Get("/wx_mini/v1/hilinkdevice/reset_device",n,(function(t){e.writeBle(c,i,"DB01A0"),wx.closeBLEConnection({deviceId:e.data.deviceId}),e.compareVersion(o,"2.17.3")>=0?wx.exitMiniProgram({success:function(e){},fail:function(e){}}):wx.redirectTo({url:"../../pages/init/init"})}),(function(e){console.log(e)})),this.hidePopup()},inputname:function(){this.setData({flag:!this.data.flag})},delDevice:function(){var e=wx.getSystemInfoSync().SDKVersion;console.log(e),wx.clearStorage({success:function(e){}}),"iOS"==this.data.system?(wx.closeBLEConnection({deviceId:this.data.deviceId,success:function(e){console.log(e),wx.closeBluetoothAdapter({success:function(e){console.log("关闭蓝牙模块")},fail:function(e){console.log(e)}})},fail:function(e){console.log(e)}}),wx.removeStorageSync("deviceId"),wx.exitMiniProgram({success:function(e){console.log(e)},fail:function(e){console.log(e)}})):(wx.closeBLEConnection({deviceId:this.data.deviceId}),wx.removeStorageSync("deviceId"),this.compareVersion(e,"2.17.3")>=0?wx.exitMiniProgram({success:function(e){},fail:function(e){}}):wx.redirectTo({url:"../init/init"}))},compareVersion:function(e,t){e=e.split("."),t=t.split(".");for(var o=Math.max(e.length,t.length);e.length<o;)e.push("0");for(;t.length<o;)t.push("0");for(var n=0;n<o;n++){var i=parseInt(e[n]),c=parseInt(t[n]);if(i>c)return 1;if(i<c)return-1}return 0},arrToStr:function(e){for(var t=e.split(":"),o=(e="",0);o<t.length;o++)e+=t[o].toLowerCase();return e},_clearInput:function(){console.log("你点击了清除输入框文字按钮"),this.setData({inputValue:""})},inputPopbind:function(e){console.log(e.detail.value);this.setData({inputValue:e.detail.value})},_cancelInput:function(){this.setData({flag:!this.data.flag}),console.log("你点击了取消")},_confirmInput:function(){var e=this,o=e.data.inputValue;console.log(o);var n={mac:e.data.deviceId,name:o};t.Get("/wx_mini/v1/hilinkdevice/update_device_config",n,(function(t){e.getName()}),(function(e){})),e.setData({flag:!e.data.flag,deviceName:o}),wx.setStorageSync("deviceName",o),console.log("你点击了确认")},getName:function(){var e=this,o={mac:wx.getStorageSync("deviceId")};t.Get("/wx_mini/v1/hilinkdevice/get_device_config",o,(function(t){var o=t.data.device_name;""!=o?(e.setData({deviceName:o,inputValue:o}),wx.setStorageSync("deviceName",o)):e.setData({deviceName:"智能杀菌牙刷杯架",inputValue:"智能杀菌牙刷杯架"})}),(function(e){console.log(e)}))},writeBle:function(e,t,o){var n=new Uint8Array(o.match(/[\da-f]{2}/gi).map((function(e){return parseInt(e,16)}))).buffer;console.log(n),wx.writeBLECharacteristicValue({deviceId:e,serviceId:t,characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:n,success:function(e){console.log("success  指令发送成功"),console.log(e)},fail:function(e){console.log(e)}})},onShow:function(){this.getName()},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/set/set.js");
 		__wxRoute = 'pages/index/index';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/index/index.js';	define("pages/index/index.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var t=getApp(),e=require("../../utils/request");Page({data:{deviceId:"",deviceName:"",result:"",visionResult:"",serviceId:"",characteristicId:"",res:"",dl:"",flag:"",resStr:"",time:"-- --",batteryVal:100,dlVal:0,i:0,nextTime:"-- --",DLwran:!1,nowVersion:"",upversionBox:!0,upversionBox2:!0,versionDesc:"",mustUp:"",newVersion:"",isUP:!0,upVal:0,clickCount:0,upversionSuccess:!0,system:t.globalData.system,otapath:"",isUpVersion:!1,otaData:"",updata_buff:"",updata_buff_cnt:"",updata_press:"",title:"",height:2*t.globalData.height+20,SystemInfo:t.globalData.SystemInfo,h:t.globalData.height,BleCon:!1,logArr:[],datalist:[],a:!1,b:!1,c:!1,d:!1,timeInterval:"",timehalf:"",hiddenStart:!1,connecting:!1,otas:"",otac:"",OTAtime:"",OTAEndTime:"",otaArr:"",clickCunter:0},onLoad:function(t){var e=this;""==wx.getStorageSync("deviceId")&&(wx.setStorageSync("deviceName",t.name),wx.setStorageSync("deviceId",t.deviceId),wx.setStorageSync("IOSID",t.IosId),wx.setStorageSync("logDataList",[])),e.setData({deviceId:wx.getStorageSync("deviceId"),deviceName:t.name,flag:2}),setTimeout((function(){wx.openBluetoothAdapter({success:function(){e.connect()},fail:function(t){wx.showToast({title:"请打开手机蓝牙",icon:"none",duration:2e3}),e.setData({flag:1})}})}),1e3)},onReady:function(){this.popup=this.selectComponent("#popup"),this.blepop=this.selectComponent("#blepop")},connect:function(){var t=this,i=wx.getStorageSync("deviceId");t.setData({connecting:!0,clickCount:0}),setTimeout((function(){wx.createBLEConnection({deviceId:i,success:function(){wx.setStorageSync("BleCon",!0),wx.onBLEConnectionStateChanged((function(e){console.log("device ".concat(e.deviceId," state has changed, connected: ").concat(e.connected)),wx.setStorageSync("BleCon",e.connected),0==e.connected?setTimeout((function(){wx.closeBluetoothAdapter({success:function(e){wx.showToast({title:"蓝牙连接已断开",icon:"none",duration:1e3}),t.showPopup(),t.setData({flag:1,BleCon:!1,dl:"",a:!1,b:!1,c:!1,batteryVal:100,connecting:!1,upversionBox:!0,upversionBox2:!0})}})}),100):t.setData({BleCon:!0,connecting:!0})})),wx.getBLEDeviceServices({deviceId:i,success:function(e){var a;t.data.system,e.services.forEach((function(t){"000000FB-0000-1000-8000-00805F9B34FB"==t.uuid&&(a=t.uuid)})),t.setData({serviceId:a}),wx.setStorageSync("serviceId",a),setTimeout((function(){wx.getBLEDeviceCharacteristics({deviceId:i,serviceId:t.data.serviceId,success:function(e){console.log("获取特征值成功"),t.setData({characteristicId:e.characteristics[1].uuid})}}),setTimeout((function(){t.notify()}),500)}),1e3)}})},fail:function(i){if(10003==i.errCode)console.log("10003----重新连接"),t.connect();else{var a={rd_session:wx.getStorageSync("session"),mobile_info_json:{mobile_info:this.data.systemInfo,locationEnabled:this.data.systemInfo.locationEnabled,bluetoothEnabled:this.data.systemInfo.bluetoothEnabled,errMsg:i}};e.Get("/wx_mini/v1/user/uploads_user_mobile_info",a,(function(t){console.log(t)}),(function(t){console.log(t)})),wx.showToast({title:"请打开或靠近设备重新连接",icon:"none",duration:2e3}),t.showPopup(),t.setData({flag:1,connecting:!1})}},complete:function(){}})}),1e3)},notify:function(){var t=this;wx.notifyBLECharacteristicValueChange({characteristicId:"00001002-0000-1000-8000-00805F9B34FB",deviceId:t.data.deviceId,serviceId:t.data.serviceId,state:!0,success:function(i){var a=Date.parse(new Date),s="DB0402"+(a=(a/1e3).toString(16));t.setData({BleCon:!0}),setTimeout((function(){t.writeBle(t.data.deviceId,t.data.serviceId,s),setTimeout((function(){t.writeBle(t.data.deviceId,t.data.serviceId,"DB0105"),setTimeout((function(){t.writeBle(t.data.deviceId,t.data.serviceId,"DB0107"),setTimeout((function(){t.writeBle(t.data.deviceId,t.data.serviceId,"DB01A4"),setTimeout((function(){if(console.log(t.data.a,t.data.b,t.data.c,t.data.d),!t.data.b&&t.writeBle(t.data.deviceId,t.data.serviceId,"DB0105"),!t.data.c&&t.writeBle(t.data.deviceId,t.data.serviceId,"DB0107"),!t.data.d&&t.writeBle(t.data.deviceId,t.data.serviceId,"DB01A4"),!t.data.a){var e=Date.parse(new Date),i="DB0402"+(e=(e/1e3).toString(16));t.writeBle(t.data.deviceId,t.data.serviceId,i)}setTimeout((function(){t.data.a&&t.data.b&&t.data.c&&t.data.d?wx.getStorage({key:"Version",success:function(t){}}):wx.closeBLEConnection({deviceId:t.data.deviceId})}),1e4)}),1e3)}),1e3)}),1e3)}),1e3)}),1e3),wx.onBLECharacteristicValueChange((function(i){console.log("特征值变化:"+t.buf2hex(i.value));var a=t.buf2hex(i.value).substring(0,6);if("bd06a2"==a){var s=Number(t.buf2hex(i.value).substring(15,16)+t.buf2hex(i.value).substring(17,18));t.setData({nowVersion:s,d:!0}),wx.setStorageSync("Version",s);var n={version_now:s,product_code:"disinfect_box",soft_type:"1"};e.Get("/wx_mini/v1/hilinkdevice/query_update_soft",n,(function(e){200==e.code?(1===e.data.is_must&&t.setData({mustUp:!0,otapath:e.data.path,newVersion:e.data.version,versionDesc:e.data.notice,upversionBox2:!1}),t.setData({isUpVersion:!0})):t.setData({isUpVersion:!1})}))}else if("bd0e02"==a){if(t.setData({result:t.arrayBufferToString(i.value),resStr:t.buf2hex(i.value),time:"-- --",nextTime:"",a:!0}),"1"==t.data.result[3]){clearInterval(t.data.timeInterval);var r=(_=t.data.resStr).substring(8,12),o=_.substring(12,16),d=t.hex2int(r)-t.hex2int(o);t.setData({timeInterval:setInterval((function(){--d>=0&&t.setData({time:t.s_to_hs(d)})}),1e3),flag:4})}else{var h=(_=t.data.resStr).substring(18,26),c=Number(t.hex2int(h));t.setData({nextTime:t.formatDate(c).split(" ")[1],flag:3})}var u=0!=t.data.dlVal&&t.data.dlVal>=t.hex2int(t.data.resStr.substring(16,18))?t.data.dlVal:t.hex2int(t.data.resStr.substring(16,18));t.setData({dlVal:u,dl:u+"%",batteryVal:u})}else if("bd0805"==a||"bd0806"==a){t.setData({result:t.arrayBufferToString(i.value),resStr:t.buf2hex(i.value),b:!0});var f=t.formatDate(t.hex2int(t.data.resStr.substring(6,14))),l=String(t.hex2int(t.data.resStr.substring(14,18))),m=Number(t.hex2int(t.data.resStr.substring(18,20))),g=t.hex2int(t.data.resStr.substring(20,22));if(t.data.BleCon)if("00"==g&&"ffffffff"!=t.data.resStr.substring(6,14)){var x={mac:t.data.deviceId,start_time:f,continuous:l,action_type:m},v=wx.getStorageSync("logDataList");v[v.length]=x,wx.setStorageSync("logDataList",v);var p="DB060601"+t.data.resStr.substring(6,14);t.writeBle(t.data.deviceId,t.data.serviceId,p)}else if("01"==g&&"ffffffff"!=t.data.resStr.substring(6,14)){var b={mac:t.data.deviceId,start_time:f,continuous:l,action_type:m},w=wx.getStorageSync("logDataList");"0"!=l&&(w[w.length]=b),wx.setStorageSync("logDataList",w);var S="DB060601"+t.data.resStr.substring(6,14);t.writeBle(t.data.deviceId,t.data.serviceId,S)}else"00"==g&&"ffffffff"==t.data.resStr.substring(6,14)&&t.syncLogData()}else if("bd0705"==a){t.setData({result:t.arrayBufferToString(i.value),resStr:t.buf2hex(i.value),timehalf:t.buf2hex(i.value).substring(6,14)});var D=t.formatDate(t.hex2int(t.data.resStr.substring(6,14))),Z=String(t.hex2int(t.data.resStr.substring(14,18))),I=Number(t.hex2int(t.data.resStr.substring(18,20))),y=wx.getStorageSync("logDataList");if(t.data.BleCon){var B={mac:t.data.deviceId,start_time:D,continuous:Z,action_type:I};"0"!=Z&&(y[y.length]=B,wx.setStorageSync("logDataList",y),t.syncLogData())}}else if("bd1102"==a||"bd0002"==a||"bd0202"==a){if(clearInterval(t.data.timeInterval),t.setData({result:t.arrayBufferToString(i.value),resStr:t.buf2hex(i.value),time:"-- --",nextTime:""}),"1"==t.data.result[3]){t.setData({flag:4});r=(_=t.data.resStr).substring(8,12),o=_.substring(12,16),d=t.hex2int(r)-t.hex2int(o);t.setData({timeInterval:setInterval((function(){--d>=0&&t.setData({time:t.s_to_hs(d)})}),1e3),flag:4})}else{h=(_=t.data.resStr).substring(18,26);console.log("下次开始消杀时间戳:"+t.hex2int(h));c=Number(t.hex2int(h));console.log(t.formatDate(c)),t.setData({nextTime:t.formatDate(c).split(" ")[1],flag:3})}u=0!=t.data.dlVal&&t.data.dlVal>=t.hex2int(t.data.resStr.substring(16,18))?t.data.dlVal:t.hex2int(t.data.resStr.substring(16,18));t.setData({dl:u+"%"})}else if("bd0b02"==a){if(clearInterval(t.data.timeInterval),t.setData({result:t.arrayBufferToString(i.value),resStr:t.buf2hex(i.value),time:"-- --",nextTime:"",clickCunter:0}),"1"==t.data.result[3])wx.hideLoading({success:function(e){var i=t.data.resStr,a=i.substring(8,12),s=i.substring(12,16),n=t.hex2int(a)-t.hex2int(s);t.setData({timeInterval:setInterval((function(){--n>=0&&t.setData({time:t.s_to_hs(n)})}),1e3),flag:4})}});else{var _;h=(_=t.data.resStr).substring(18,26),c=Number(t.hex2int(h));t.setData({nextTime:t.formatDate(c).split(" ")[1],flag:3})}u=0!=t.data.dlVal&&t.data.dlVal>=t.hex2int(t.data.resStr.substring(16,18))?t.data.dlVal:t.hex2int(t.data.resStr.substring(16,18));t.setData({dl:u+"%"})}else if("bd0d07"==a){var N=t.arrayBufferToString(i.value),C=t.buf2hex(i.value);t.ToList(N),t.setData({Listvalue:C,c:!0})}else if("bd0d08"==a){var T=t.arrayBufferToString(i.value),L=t.buf2hex(i.value);t.setData({Listvalue:L,c:!0}),t.ToList(T),setTimeout((function(){wx.navigateBack({delta:1})}),2e3)}else"bd05a1"==a&&t.setData({DLwran:!0})}))},fail:function(e){t.notify()},complete:function(t){}})},lianjie:function(){var t=this;0==t.data.clickCount&&(t.setData({clickCount:t.data.clickCount+1}),setTimeout((function(){wx.openBluetoothAdapter({success:function(){t.setData({flag:2}),t.connect()},fail:function(){wx.showToast({title:"请先打开手机蓝牙",icon:"none",duration:1e3})}})}),1e3),setTimeout((function(){t.setData({clickCount:0})}),1e3))},writeBle:function(t,e,i){var a=i,s=new Uint8Array(a.match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)})));console.log("发送的数据:",a);var n=s.buffer;wx.writeBLECharacteristicValue({deviceId:t,serviceId:e,characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:n,success:function(t){},fail:function(t){}})},addZero:function(t){return t<10?"0"+t:t},s_to_hs:function(t){var e;return e=Math.floor(t/60),t%=60,(e=1==(e+="").length?"0"+e:e)+":"+(t=1==(t+="").length?"0"+t:t)},formatDate:function(t){var e=(t=new Date(1e3*t)).getFullYear()+"-",i=(t.getMonth()+1<10?"0"+(t.getMonth()+1):t.getMonth()+1)+"-",a=t.getDate()<10?"0"+t.getDate():t.getDate(),s=(t.getHours()<10?"0"+t.getHours():t.getHours())+":",n=t.getMinutes()<10?"0"+t.getMinutes():t.getMinutes();t.getSeconds(),t.getSeconds();return e+i+a+" "+s+n},Str2Bytes:function(t){var e=0,i=t.length;if(i%2!=0)return null;i/=2;for(var a=new Array,s=0;s<i;s++){var n=t.substr(e,2),r=parseInt(n,16);a.push(r),e+=2}return a},strToSn:function(t){for(var e=t.substring(10,36),i=e.length,a=[],s=0;s<i/2;s++)a[s]=e.substring(2*s,2*s+2);return this.arrToSnStr(a)+t.substring(8,10)+t.substring(6,8)},arrToSnStr:function(t){var e=this,i="";return t.reverse(),t.forEach((function(t){i+=String.fromCharCode(e.hex2int(t))})),i},buf2hex:function(t){return Array.prototype.map.call(new Uint8Array(t),(function(t){return("00"+t.toString(16)).slice(-2)})).join("")},arrayBufferToString:function(t){for(var e=new DataView(t),i=[],a=0;a<e.byteLength;a++){var s=e.getUint8(a).toString(16);i.push(s)}return i},hex2int:function(t){for(var e,i=t.length,a=new Array(i),s=0;s<i;s++)48<=(e=t.charCodeAt(s))&&e<58?e-=48:e=(223&e)-65+10,a[s]=e;return a.reduce((function(t,e){return t=16*t+e}),0)},syncLogData:function(){var t=this,i=wx.getStorageSync("logDataList"),a={rd_session:wx.getStorageSync("session"),log_list:i},s=[];e.Get("/wx_mini/v1/device/uploads_device_use_log",a,(function(t){console.log(a),console.log("历史记录------------保存成功"),wx.setStorageSync("logDataList",s)}),(function(e){console.log("历史记录------------保存失败"),console.log("当前缓存的记录"),console.log(i);wx.login({success:function(e){console.log(e);var i=e.code;wx.request({url:"https://api.sh-lifefun.cn/wx_mini/v1/user/get_3rd_session",data:{code:i},success:function(e){wx.setStorageSync("session",e.data.data.rd_session),t.syncLogData()}})},fail:function(t){wx.showToast({title:"请检查网络连接状态",icon:"none",duration:2e3})}})}))},ToList:function(t){var e=this.hex2int(t[5]),i=this.hex2int(t[8]),a=this.hex2int(t[11]),s=this.hex2int(t[14]),n=[];"ff"!=t[3]&&(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)),"ff"!=t[6]&&"ff"!=t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[6]&&"ff"==t[3]&&(n=[{id:1,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)),"ff"!=t[9]&&"ff"!=t[6]&&"ff"!=t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))},{id:3,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[9]&&"ff"!=t[6]&&"ff"==t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))},{id:2,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[9]&&"ff"==t[6]&&"ff"==t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[9]&&"ff"==t[6]&&"ff"!=t[3]&&(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)),"ff"!=t[12]&&"ff"!=t[9]&&"ff"!=t[6]&&"ff"!=t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))},{id:3,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))},{id:4,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"!=t[9]&&"ff"!=t[6]&&"ff"==t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))},{id:2,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))},{id:3,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"!=t[9]&&"ff"==t[6]&&"ff"!=t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))},{id:3,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"==t[9]&&"ff"!=t[6]&&"ff"!=t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))},{id:3,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"!=t[9]&&"ff"==t[6]&&"ff"==t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[9]))+":"+this.addZero(this.hex2int(t[10])),timing:a,min:60*Number(this.addZero(this.hex2int(t[9])))+Number(this.addZero(this.hex2int(t[10])))},{id:2,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"==t[9]&&"ff"!=t[6]&&"ff"==t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[6]))+":"+this.addZero(this.hex2int(t[7])),timing:i,min:60*Number(this.addZero(this.hex2int(t[6])))+Number(this.addZero(this.hex2int(t[7])))},{id:2,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"==t[9]&&"ff"==t[6]&&"ff"!=t[3]?(n=[{id:1,time:this.addZero(this.hex2int(t[3]))+":"+this.addZero(this.hex2int(t[4])),timing:e,min:60*Number(this.addZero(this.hex2int(t[3])))+Number(this.addZero(this.hex2int(t[4])))},{id:2,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist)):"ff"!=t[12]&&"ff"==t[9]&&"ff"==t[6]&&"ff"==t[3]&&(n=[{id:1,time:this.addZero(this.hex2int(t[12]))+":"+this.addZero(this.hex2int(t[13])),timing:s,min:60*Number(this.addZero(this.hex2int(t[12])))+Number(this.addZero(this.hex2int(t[13])))}],this.setData({datalist:n}),wx.setStorageSync("clearList",this.data.datalist))},showPopup:function(){this.popup.showPopup()},_error:function(){this.popup.hidePopup()},_success:function(){this.popup.hidePopup(),this.lianjie()},getdeviceName:function(){var t=this,i={mac:t.data.deviceId};e.Get("/wx_mini/v1/hilinkdevice/get_device_config",i,(function(e){console.log(e);var i=e.data.device_name;""!=i?t.setData({title:i}):t.setData({title:"智能杀菌牙刷杯架"})}),(function(t){}))},tosetpage:function(){wx.navigateTo({url:"/pages/set/set?deviceName="+this.data.deviceName})},tohistorypage:function(){wx.navigateTo({url:"/pages/history/history"})},totimingpage:function(){wx.navigateTo({url:"/pages/timing/timing"})},tohelppage:function(){wx.navigateTo({url:"/pages/problem/problem"})},UpVersion:function(){var t=this,i={version_now:t.data.nowVersion,product_code:"disinfect_box",soft_type:"1"};e.Get("/wx_mini/v1/hilinkdevice/query_update_soft",i,(function(e){200==e.code?t.setData({otapath:e.data.path,newVersion:e.data.version,versionDesc:e.data.notice,upversionBox2:!1}):300==e.code&&t.setData({nowVersion:t.data.nowVersion,upversionBox:!1})}),(function(t){console.log(t)}))},hideupversion:function(){this.setData({upversionSuccess:!0,upversionBox:!0})},compareVersion:function(t,e){t=t.split("."),e=e.split(".");for(var i=Math.max(t.length,e.length);t.length<i;)t.push("0");for(;e.length<i;)e.push("0");for(var a=0;a<i;a++){var s=parseInt(t[a]),n=parseInt(e[a]);if(s>n)return 1;if(s<n)return-1}return 0},hideupversionBox2:function(){var t=wx.getSystemInfoSync().SDKVersion;this.data.mustUp?this.compareVersion(t,"2.17.3")>=0?wx.exitMiniProgram({success:function(t){},fail:function(t){}}):wx.redirectTo({url:"../../pages/init/init"}):this.setData({upversionBox2:!0})},upversionNow:function(){this.setData({isUP:!1}),this.upversionFun()},upversionFun:function(){var t=this;wx.getBLEDeviceServices({deviceId:t.data.deviceId,success:function(e){var i="00010203-0405-0607-0809-0A0B0C0D1912";t.setData({otas:i}),wx.getBLEDeviceCharacteristics({deviceId:t.data.deviceId,serviceId:i,success:function(e){console.log(e),t.setData({otac:e.characteristics[0].uuid})}})}});var e=t.data.otapath;wx.downloadFile({url:"https://api.sh-lifefun.cn/wx_mini/v1/hilinkdevice/download?path="+e,success:function(e){var i=e.tempFilePath;wx.saveFile({tempFilePath:i,success:function(e){var i=e.savedFilePath;wx.getFileSystemManager().readFile({filePath:i,success:function(e){var i=new Uint8Array(e.data),a=i.byteLength%16==0?i.byteLength/16:Math.floor(i.byteLength/16)+1;t.setData({updata_buff:i,updata_buff_cnt:0,updata_press:a}),t.close(),setTimeout((function(){t.SendBlePkg()}),2e3)}})}})}})},SendBlePkg:function(){for(var t=[],e=0;e<=this.data.updata_press;e++){for(var i,a=new Array,s=0;s<18;s++)s<=1?(a[0]=parseInt(e%256),a[1]=parseInt(e/256)):s-2+16*e<this.data.updata_buff.byteLength?a[s]=this.data.updata_buff[s-2+16*e]:a[s]=255;i=this.CRC16S(a),t[e]=i,e==this.data.updata_press&&(console.log(e),this.setData({otaArr:t}),this.ReadyOTA())}},ReadyOTA:function(){var t=this,e=new Uint8Array("01ff".match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;wx.writeBLECharacteristicValue({deviceId:t.data.deviceId,serviceId:t.data.otas,characteristicId:t.data.otac,value:e,success:function(e){t.setData({OTAtime:(new Date).getTime()}),t.StartOTA()},fail:function(t){}})},StartOTA:function(){var t=this,i=t.data.otaArr,a=0,s=setInterval((function(){var n=t.data.updata_buff_cnt;if(a==n)if(a++,n<=t.data.updata_press){var r=i[n],o=new Uint8Array(r.match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;wx.writeBLECharacteristicValue({deviceId:t.data.deviceId,serviceId:t.data.otas,characteristicId:t.data.otac,value:o,success:function(e){console.log(t.data.updata_buff_cnt),t.setData({upVal:Math.round(t.data.updata_press/100)*t.data.upVal<=t.data.updata_buff_cnt?t.data.upVal+1:t.data.upVal,updata_buff_cnt:t.data.updata_buff_cnt+1})},fail:function(e){t.data.BleCon?a--:(clearInterval(s),t.setData({upversionBox2:!0,isUP:!0,upVal:0}),wx.showToast({title:"升级失败",icon:"none"}),setTimeout((function(){wx.hideToast({success:function(t){}})}),2e3)),console.log((new Date).getTime()-Number(t.data.OTAtime))}})}else{var d=new Uint8Array(8);d[0]=2,d[1]=255,d[2]=255&t.data.updata_press,d[3]=t.data.updata_press>>8&255,d[4]=255&~t.data.updata_press,d[5]=~t.data.updata_press>>8&255;var h=t.buf2hex(d)+t.CRC16S(d),c=new Uint8Array(h.match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;wx.writeBLECharacteristicValue({deviceId:t.data.deviceId,serviceId:t.data.otas,characteristicId:t.data.otac,value:c,success:function(i){setTimeout((function(){t.setData({isUpVersion:!1,upversionSuccess:!1,isUP:!0,upversionBox2:!0,upVal:0,nowVersion:t.data.newVersion})}),2e3);var a={mac:t.data.deviceId,version:t.data.newVersion,system_info:t.data.systemInfo};e.Get("/wx_mini/v1/hilinkdevice/mac_version_log",a),console.log((new Date).getTime()-Number(t.data.OTAtime))},fail:function(t){}}),clearInterval(s)}}),15)},CRC16S:function(t){for(var e="",i=0;i<t.length;i++){var a=t[i].toString(16);1==a.length&&(a="0"+a),e+=a}return e+this.ToModbusCRC16(e)},CRC16:function(t){var e=t.length;if(e>0){for(var i=65535,a=0;a<e;a++){i^=t[a];for(var s=0;s<8;s++)i=0!=(1&i)?i>>1^40961:i>>1}return[(65280&i)>>8,255&i]}return[0,0]},isArray:function(t){return"[object Array]"===Object.prototype.toString.call(t)},ToCRC16:function(t,e){return this.toString(this.CRC16(this.isArray(t)?t:this.strToByte(t)),e)},ToModbusCRC16:function(t,e){return this.toString(this.CRC16(this.isArray(t)?t:this.strToHex(t)),e)},strToByte:function(t){for(var e=t.split(""),i=[],a=0,s=e.length;a<s;a++){var n=encodeURI(e[a]);if(1==n.length)i.push(n.charCodeAt());else for(var r=n.split("%"),o=1;o<r.length;o++)i.push(parseInt("0x"+r[o]))}return i},convertChinese:function(t){for(var e=t.split(""),i=[],a=0,s=e.length;a<s;a++){var n=e[a].charCodeAt();n<=0||n>=127?i.push(n.toString(16)):i.push(e[a])}return i},filterChinese:function(t){for(var e=t.split(""),i=[],a=0,s=e.length;a<s;a++){var n=e[a].charCodeAt();n>0&&n<127&&i.push(e[a])}return i},strToHex:function(t,e){t=(t=e?this.filterChinese(t).join(""):this.convertChinese(t).join("")).replace(/s/g,"");for(var i=(t+=t.length%2!=0?"0":"").length/2,a=[],s=0;s<i;s++)a.push(parseInt(t.substr(2*s,2),16));return a},padLeft:function(t,e,i){null==i&&(i="0");for(var a=0,s=e-t.length;a<s;a++)t=i+t;return t},toString:function(t,e){void 0===e&&(e=!0);var i=t[0],a=t[1];return this.padLeft((e?i+256*a:256*i+a).toString(16).toUpperCase(),4,"0")},onShow:function(t){var e=this;if(wx.onBluetoothAdapterStateChange((function(t){t.available&&0==e.data.BleCon&&0==e.data.connecting?(e.setData({flag:2}),e.connect()):wx.closeBluetoothAdapter({success:function(t){0==e.data.BleCon&&wx.showToast({title:"请打开手机蓝牙",icon:"none",duration:2e3})}})})),e.getdeviceName(),e.data.BleCon){var i=Date.parse(new Date);i=(i/1e3).toString(16),console.log(i);var a="DB0402"+i;e.writeBle(e.data.deviceId,e.data.serviceId,a)}},start:function(){var t=this;if(this.data.BleCon&&0==this.data.clickCunter)if(this.data.DLwran)wx.showToast({title:"电池电量过低！请及时更换!",duration:2e3,icon:"none"}),this.setData({hiddenStart:!0});else{this.setData({time:"",clickCunter:1}),wx.showLoading({title:"正在开启",mask:!0});var e=new Uint8Array("DB020401".match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;setTimeout((function(){wx.writeBLECharacteristicValue({deviceId:t.data.deviceId,serviceId:t.data.serviceId,characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:e,success:function(t){},fail:function(t){},complete:function(t){}})}),1e3)}},close:function(){var t=this;if(t.data.BleCon&&0==t.data.clickCunter){t.setData({time:"",clickCunter:1}),wx.showLoading({title:"正在关闭",mask:!0});var e=new Uint8Array("DB020400".match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;setTimeout((function(){wx.writeBLECharacteristicValue({deviceId:t.data.deviceId,serviceId:t.data.serviceId,characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:e,success:function(t){wx.hideLoading({success:function(t){}})},fail:function(t){},complete:function(t){}})}),1e3)}},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/index/index.js");
 		__wxRoute = 'pages/addtiming/addtime';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/addtiming/addtime.js';	define("pages/addtiming/addtime.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";for(var t=getApp(),a=[],e=[],n=0;n<=23;n++)a.push(n);for(var o=0;o<=59;o++)e.push(o);Page({data:{height:2*t.globalData.height+20,navbarData:{showCapsule:1,title:"新建定时"},listvalue:"",h:a,m:e,flag:!0,timing:3,timelist:[3,4,5,6],value:[0,0],len:"",isAdd:!1},bindChange:function(t){this.setData({value:t.detail.value}),console.log(this.data.value)},onLoad:function(t){console.log(t.len);var a=t.listValue;console.log(a),this.setData({listvalue:a,len:Number(t.len)+1})},onReady:function(){this.navbar=this.selectComponent("#navbar")},picktime:function(){this.showPopup()},_cancel:function(){console.log("你点击了取消"),this.hidePopup()},radioChange:function(t){this.setData({timing:t.detail.value,flag:!this.data.flag})},showPopup:function(){this.setData({flag:!this.data.flag})},hidePopup:function(){this.setData({flag:!this.data.flag})},saveTiming:function(){var t=this,a=wx.getStorageSync("clearList");console.log(a),console.log(t.data.len);var e,n,o,i=t.data.len,l=t.data.timing;l="0"+Number(l).toString(16),console.log(t.data.value),e=Number(t.data.value[0])<16?"0"+Number(t.data.value[0]).toString(16):Number(t.data.value[0]).toString(16),n=Number(t.data.value[1])<16?"0"+Number(t.data.value[1]).toString(16):Number(t.data.value[1]).toString(16),o=l;var s="DB08080"+t.data.len+t.data.listvalue+e+n+o;console.log(t.data.listvalue),console.log(s);var u=wx.getStorageSync("deviceId"),c=wx.getStorageSync("serviceId"),r=60*t.data.value[0]+t.data.value[1];if(console.log(r),1==i)(a[0].min+59<r||a[0].min>r+59)&&r!=a[0].min?t.writeBle(u,c,s):wx.showToast({title:"两条定时消杀间隔必须大于一小时!",icon:"none",duration:2e3});else for(var d=0;d<a.length;d++){if(!((r+59<a[d].min||r>a[d].min+59)&&r-a[0].min<=1380)){t.setData({isAdd:!1});break}t.setData({isAdd:!0})}setTimeout((function(){wx.getStorageSync("BleCon")?t.data.isAdd?t.writeBle(u,c,s):wx.showToast({title:"两条定时消杀间隔必须大于一小时!",icon:"none",duration:2e3}):wx.showToast({title:"该操作需在设备已连接情况下进行",duration:2e3,icon:"none"})}),200)},writeBle:function(t,a,e){var n=new Uint8Array(e.match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;wx.writeBLECharacteristicValue({deviceId:t,serviceId:a,characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:n,success:function(t){wx.showToast({title:"保存成功"})},fail:function(t){console.log(t)}})},onShow:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/addtiming/addtime.js");
 		__wxRoute = 'pages/edittiming/edittiming';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/edittiming/edittiming.js';	define("pages/edittiming/edittiming.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";for(var t=getApp(),i=[],a=[],e=0;e<=23;e++)e<10&&(e="0"+e),i.push(e);for(var o=0;o<=59;o++)o<10&&(o="0"+o),a.push(o);Page({data:{height:2*t.globalData.height+20,navbarData:{showCapsule:1,title:"编辑定时"},flag:!0,timelist:[3,4,5,6],h:i,m:a,value:[1,10],timing:"",id:0,arr:[3,6,9,12],listLen:0,StrData:"",BleCon:!1,isClick:!0,delList:!0,popFlag:!1,arrData:[],isEdit:!1,selfFlag:!1},onLoad:function(t){var i=wx.getStorageSync("clearList");i=i.sort(this.compare("min"));var a=t.time,e=this.timetoarray(a),o=t.len,n=t.id,s=t.Data;o<=1&&this.setData({delList:!1}),this.setData({value:e,arrData:i,timing:t.timing,id:n,listLen:t.len-1,StrData:s})},timetoarray:function(t){return[t.split(":")[0].replace(/\b(0+)/gi,""),t.split(":")[1]]},bindChange:function(t){this.setData({value:t.detail.value})},radioChange:function(t){this.setData({timing:t.detail.value,flag:!this.data.flag})},onReady:function(){this.popup=this.selectComponent("#popup")},compare:function(t){return function(i,a){return i[t]-a[t]}},preData:function(){var t=this,i=wx.getStorageSync("BleCon");if(console.log(i),i){var a=t.data.timing;a=Number(a).toString(16);var e=60*t.data.value[0]+Number(t.data.value[1]),o=t.data.listLen+1,n=t.data.id,s=t.data.arrData;if(1==o)t.setData({selfFlag:!0}),t.wirteData(a);else if(s[n-1].min==e)t.wirteData(a);else{for(var r=[],l=1;l<=s.length;l++)l!=n&&r.push(s[l-1]);setTimeout((function(){console.log(r);for(var i=0;i<r.length;i++){if(e==r[i].min){wx.showToast({title:"存在相同时间点的定时,请重新选择！",duration:2e3,icon:"none"});break}if(!((e+59<r[i].min||e>r[i].min+59)&&e-r[0].min<=1380)){t.setData({isEdit:!1}),wx.showToast({title:"两条定时消杀间隔必须大于一小时!",duration:2e3,icon:"none"});break}t.setData({isEdit:!0})}}),100)}setTimeout((function(){t.data.isEdit&&t.wirteData(a)}),400)}else wx.showToast({title:"该操作需在设备已连接情况下进行",duration:2e3,icon:"none",complete:function(){wx.hideToast({success:function(t){}})}})},wirteData:function(t){var i=this.data.StrData,a=this.strTo2Arr(i);this.data.isClick&&this.setData({isClick:!1}),Number(this.data.value[0])<16?a[3*(this.data.id-1)]="0"+Number(this.data.value[0]).toString(16):a[3*(this.data.id-1)]=Number(this.data.value[0]).toString(16),Number(this.data.value[1])<16?a[3*(this.data.id-1)+1]="0"+Number(this.data.value[1]).toString(16):a[3*(this.data.id-1)+1]=Number(this.data.value[1]).toString(16),a[3*(this.data.id-1)+2]="0"+t;var e="DB08080"+(this.data.listLen+1)+a.join("");console.log("发送的修改指令:"+e);var o=wx.getStorageSync("deviceId"),n=wx.getStorageSync("serviceId");this.writeBle(o,n,e),wx.showToast({title:"保存成功"})},delData:function(){var t=wx.getStorageSync("BleCon");if(this.data.isClick&&this.setData({isClick:!1}),t){var i=this.data.StrData,a=this.strTo6Arr(i);console.log(a),a.splice(this.data.id-1,1);var e="DB00080"+this.data.listLen+a.join("");console.log("发送的删除指令:"+e);var o=wx.getStorageSync("deviceId"),n=wx.getStorageSync("serviceId");this.writeBle(o,n,e),wx.showToast({title:"删除成功"})}else wx.showToast({title:"该操作需在设备已连接情况下进行",duration:2e3,icon:"none"}),setTimeout((function(){wx.hideToast({success:function(t){}})}),2e3)},picktime:function(){this.showTimePopup()},showTimePopup:function(){console.log("显示弹窗"),this.setData({flag:!this.data.flag})},_cancelTimepop:function(){console.log("你点击了取消"),this.hideTimePopup()},hideTimePopup:function(){this.setData({flag:!this.data.flag})},addZero:function(t){return t<10?"0"+t:10==t?"0a":t},strTo2Arr:function(t){for(var i=[],a=0;a<t.length;a+=2)i.push(t.substring(a,a+2));return i},strTo6Arr:function(t){for(var i=[],a=0;a<t.length;a+=6)i.push(t.substring(a,a+6));return i},writeBle:function(t,i,a){var e=new Uint8Array(a.match(/[\da-f]{2}/gi).map((function(t){return parseInt(t,16)}))).buffer;wx.writeBLECharacteristicValue({deviceId:t,serviceId:i,characteristicId:"00001001-0000-1000-8000-00805F9B34FB",value:e,success:function(t){console.log("success  指令发送成功"),console.log(t)},fail:function(t){console.log(t)}})},buf2hex:function(t){return Array.prototype.map.call(new Uint8Array(t),(function(t){return("00"+t.toString(16)).slice(-2)})).join("")},hidePopup:function(){this.popup.hidePopup()},showPopup:function(){console.log("显示弹窗"),this.popup.showPopup()},_error:function(){console.log("你点击了取消"),this.hidePopup()},_success:function(){console.log("确认删除"),this.hidePopup(),this.delData()},onShow:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/edittiming/edittiming.js");
 		__wxRoute = 'pages/timing/timing';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/timing/timing.js';	define("pages/timing/timing.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var t=getApp();Page({data:{height:2*t.globalData.height+20,h:t.globalData.height,flag:!0,hiddenExplain:!0,deviceId:"",serviceId:"",Listvalue:"",datalist:[]},onLoad:function(t){},buf2hex:function(t){return Array.prototype.map.call(new Uint8Array(t),(function(t){return("00"+t).slice(-2)})).join("")},hex2int:function(t){for(var i,a=t.length,e=new Array(a),n=0;n<a;n++)48<=(i=t.charCodeAt(n))&&i<58?i-=48:i=(223&i)-65+10,e[n]=i;return e.reduce((function(t,i){return t=16*t+i}),0)},arrayBufferToString:function(t){for(var i=new DataView(t),a=[],e=0;e<i.byteLength;e++){var n=i.getUint8(e);a.push(n)}return a},addZero:function(t){return t<10?"0"+t:t},onReady:function(){},checkExplain:function(){this.setData({hiddenExplain:!this.data.hiddenExplain})},_backhome:function(){wx.navigateBack()},onShow:function(t){var i=wx.getStorageSync("clearList");console.log(i);for(var a=i.sort(this.compare("min")),e=0;e<i.length;e++)a[e].id=e+1;this.setData({datalist:a}),4==this.data.datalist.length?this.setData({flag:!1}):this.setData({flag:!0})},compare:function(t){return function(i,a){return i[t]-a[t]}},toaddtiming:function(t){var i=this.data.datalist.length;console.log(i);var a=this.arrToStr(this.data.datalist);wx.navigateTo({url:"/pages/addtiming/addtime?listValue="+a+"&&len="+i})},toedittiming:function(t){var i=this.data.datalist.length,a=this.arrToStr(this.data.datalist);console.log(a),wx.navigateTo({url:"/pages/edittiming/edittiming?time="+t.currentTarget.dataset.time+"&&timing="+t.currentTarget.dataset.timing+"&&id="+t.currentTarget.dataset.id+"&&len="+i+"&&Data="+a})},arrToStr:function(t){var i=t.length;return 1==i?this.add(Number(t[0].time.split(":")[0]))+this.add(Number(t[0].time.split(":")[1]))+this.add(t[0].timing):2==i?this.add(Number(t[0].time.split(":")[0]))+this.add(Number(t[0].time.split(":")[1]))+this.add(t[0].timing)+this.add(Number(t[1].time.split(":")[0]))+this.add(Number(t[1].time.split(":")[1]))+this.add(t[1].timing):3==i?this.add(Number(t[0].time.split(":")[0]))+this.add(Number(t[0].time.split(":")[1]))+this.add(t[0].timing)+this.add(Number(t[1].time.split(":")[0]))+this.add(Number(t[1].time.split(":")[1]))+this.add(t[1].timing)+this.add(Number(t[2].time.split(":")[0]))+this.add(Number(t[2].time.split(":")[1]))+this.add(t[2].timing):4==i?this.add(Number(t[0].time.split(":")[0]))+this.add(Number(t[0].time.split(":")[1]))+this.add(t[0].timing)+this.add(Number(t[1].time.split(":")[0]))+this.add(Number(t[1].time.split(":")[1]))+this.add(t[1].timing)+this.add(Number(t[2].time.split(":")[0]))+this.add(Number(t[2].time.split(":")[1]))+this.add(t[2].timing)+this.add(Number(t[3].time.split(":")[0]))+this.add(Number(t[3].time.split(":")[1]))+this.add(t[3].timing):void 0},add:function(t){return t>=16?t.toString(16):"0"+t.toString(16)},onHide:function(){this.setData({hiddenExplain:!0})},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/timing/timing.js");
 		__wxRoute = 'pages/deviceInfo/deviceInfo';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/deviceInfo/deviceInfo.js';	define("pages/deviceInfo/deviceInfo.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var e=getApp();Page({data:{height:2*e.globalData.height+20,deviceId:"",system:e.globalData.system,navbarData:{showCapsule:1,title:"设备信息"},name:" ",msc:" ",seq:"",devicedModel:" "},onLoad:function(e){var t=this;wx.getStorage({key:"Version",success:function(e){console.log("=========="),t.setData({seq:e.data})}}),"iOS"==t.data.system?wx.getStorage({key:"IOSID",success:function(e){t.setData({deviceId:e.data})}}):wx.getStorage({key:"deviceId",success:function(e){t.setData({deviceId:e.data})}})},onReady:function(){},onShow:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/deviceInfo/deviceInfo.js");
 		__wxRoute = 'pages/problem/problem';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/problem/problem.js';	define("pages/problem/problem.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var n=getApp();Page({data:{height:2*n.globalData.height+20,navbarData:{showCapsule:1,title:"常见问题"},problemList:[{q:"客服联系方式",a:"微信：laifeng-sh \n电话:  400-009-8685\n电话客服工作时间:  9:00-18:00"},{q:"消杀时间设置失败？",a:"请注意两次定时消杀时间间隔不小于1小时,且最多设置四条消杀,最少一条。"},{q:"设备连接缓慢或多次连接不上?",a:"请在后台清除微信和小程序,并重启蓝牙和定位。"},{q:"固件升级失败?",a:"升级过程中请尽量确保手机靠近设备且保持连接。"},{q:"开启了蓝牙及定位仍无法连接?",a:"请确保微信定位以及蓝牙已授权。"}]},onLoad:function(n){},onReady:function(){},onShow:function(){},onHide:function(){},onUnload:function(){},onPullDownRefresh:function(){},onReachBottom:function(){},onShareAppMessage:function(){}}); 
 			}); 	require("pages/problem/problem.js");
 		__wxRoute = 'pages/logs/logs';__wxRouteBegin = true; 	__wxAppCurrentFile__ = 'pages/logs/logs.js';	define("pages/logs/logs.js", function(require, module, exports, window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket,Reporter,webkit,WeixinJSCore){ 			
"use strict";var t=require("../../utils/util.js");Page({data:{logs:[]},onLoad:function(){this.setData({logs:(wx.getStorageSync("logs")||[]).map((function(a){return{date:t.formatTime(new Date(a)),timeStamp:a}}))})}}); 
 			}); 	require("pages/logs/logs.js");
 