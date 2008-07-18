function getCurrentUser(cb){
	var request = new Douban.Request.User({userId: oauth.options.userId})
	request.addEvent('success', function(user){
		cusr = user
		if ($defined(user.link.icon)) $("cuicon").set('src', user.link.icon);
		var elems = [
			new Element('a', {'html': user.name, 'href': '#', 'events': {'click': function(){air.navigateToURL(new air.URLRequest(user.link.alternate))}}})
		]
		if ($defined(user.link.homepage)) {
			elems.push( new Element('span', {'text': '-', 'style': 'padding: 0 8px'}))
			elems.push(
				new Element('a', {'html': user.link.homepage, 'href': '#', 'events': {'click': function(){air.navigateToURL(new air.URLRequest(user.link.homepage))}}})
			)
		}
		$('cuinfo').empty();
		$('cuinfo').adopt(elems);
		if ($defined(cb)) cb();
	})
	request.addEvent('failure', function(){
		$('cuinfo').empty();
		$('cuinfo').adopt([
			new Element('button', {'html': '获取用户信息失败, 重新获取?','events': {'click': function(){
				$('cuinfo').empty(); request.send();
			}}})
		])
	})
	request.send();
}
	
function getUserCollection(options){
	var request = new Douban.Request.UserCollection($extend(options, {
		userId: cusr.nid,
		maxresults: 50,
	}))
	request.addEvent('success', function(c){
		$('content').removeClass('loading');
		$('pgtinfo').set('text', c.startIndex + ' - ' + (c.startIndex + c.entries.length - 1)+ ', 共'+c.totalResults+'个结果')
		$('prev').removeEvents('click')
		$('next').removeEvents('click')
		if (c.startIndex > 1) {
			$('prev').set('disabled', false)
			$('prev').addEvent('click', function(){
				request.send({startindex: ((c.startIndex - request.options.maxresults) < 1) ? 1 : (c.startIndex - request.options.maxresults)})
			})
		}
		else $('prev').set('disabled', true)
		if ((c.startIndex + c.entries.length - 1) < c.totalResults) {
			$('next').set('disabled', false)
			$('next').addEvent('click', function(){
				request.send({startindex: c.startIndex + request.options.maxresults})
			})
		}
		else $('next').set('disabled', true)
		c.entries.each(function(cln){
			wall.addCollection(cln)
		})
		tips.attach('#content .subj')
	})
	request.addEvent('failure', function(c){
		$('content').removeClass('loading');
		$('content').adopt([
			new Element('button', {'html': '获取信息失败, 可能你的网络连接有问题, 重试?',
			'style': 'position:absolute;left:250px;top:180px;',
			'events': {'click': function(){
				request.send();
			}}})
		])
	})
	request.addEvent('request', function(c){
		wall.clear();
		$('content').addClass('loading');
	})
	request.send();
}
	
function clnBtnClick(btn, options){
	$$('#ctlpal button').set('disabled', false);
	$(btn).set('disabled', true);
	getUserCollection(options);
}
	
var Wall = new Class({
	initialize: function(dom){
		this.dom = dom
	},
	addCollection: function(cln){
		var t = $random(5, 330)
		var l = $random(5, 688)
		var elem = new Element('img', {
			'src': cln.subject.link.image,
			'class': 'subj',
			'style': 'left:'+l+'px;top:'+t+'px;',
			'events': {
				'mouseenter': function(){
					(new Fx.Morph(elem, {
						duration: 250
					})).start({
						height: elem.naturalHeight, 
						width: elem.naturalWidth,
						top: elem.retrieve('naturalTop') - elem.naturalHeight/6,
						left: elem.retrieve('naturalLeft') - elem.naturalWidth/6
					});
				},
				'mouseleave':function(){
					(new Fx.Morph(elem, {
						duration: 250
					})).start({
						height:elem.naturalHeight*2/3, 
						width: elem.naturalWidth*2/3,
						top: elem.retrieve('naturalTop'),
						left: elem.retrieve('naturalLeft')
					});
				},
				'click':function(){
					air.navigateToURL(new air.URLRequest(cln.subject.link.alternate))
				}
			}
		})
		this.dom.grab(elem);
		elem.addEvent('load', function(){
			elem.setStyle('width', elem.naturalWidth*2/3)
			elem.setStyle('height', elem.naturalHeight*2/3)
		})
		
		elem.store('naturalLeft', l)
		elem.store('naturalTop', t)
		elem.store('tip:title', '<h3>'+cln.subject.title+'</h3>');
		var txt = ''
		if (cln.tag.length > 0) txt += '<div>tags: '+cln.tag.map(function(i){return i.name}).join(' ')+'</div>'
		if ($defined(cln.rating)) txt += '<span class="stars stars'+cln.rating.value+'"></span>'
		txt += '<span style="margin-left:3px">'+cln.updated.split('T')[0]+'</span>'
		elem.store('tip:text', txt);
	},
	clear: function(){
		tips.hide();
		tips.detach('#content .subj')
		this.dom.empty();
	},
	refresh: function(){
		var elems = this.dom.getElements('img.subj');
		elems.each(function(elem){
			var t = $random(5, 330);
			var l = $random(5, 688);
			elem.store('naturalLeft', l);
			elem.store('naturalTop', t);
			
			(new Fx.Morph(elem, {duration: 250})).start({
				top: elem.retrieve('naturalTop'),
				left: elem.retrieve('naturalLeft')
			});
		})
	}
})
