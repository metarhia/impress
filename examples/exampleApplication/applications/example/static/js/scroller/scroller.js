/*
*v. 0.2.1
*/
(function($){

  $.fn.scroller = function(options) {
    var scrollHeight = 0,
      scrollWidth = 0,
      maxTop = 0,
      maxLeft = 0,
      vMaxTop = 0,
      hMaxLeft = 0,
      mDown = false,
      container = this,
      tmbOffset = 0,
      isBottom = false,
      positionTop = 0,
      positionLeft = 0,
      isVscroll = true,
      isHscroll = true,
      isRemove = false,
      showBoth = false,
      touchstart = { top: 0, left: 0};

    var content = $("<div class='scrollerContent' tabindex=0 ></div>"),
      vThumb = $("<div class='scrollthumb-v'></div>"),
      vTrack = $("<div class='srcolltrack-v'></div>").wrapInner(vThumb),
      hThumb = $("<div class='scrollthumb-h'></div>"),
      hTrack = $("<div class='srcolltrack-h'></div>").wrapInner(hThumb);

    switch (options) {
      case 'x': isVscroll = false;  break;
      case 'y': isHscroll = false;  break;
      case 'remove':
      case 'r': isRemove = true;    break;
      default:  break;
    };

    if(isRemove)
      removeScroll();
    else
      init();

    return this;

    function init(){

      container.data('style', container.attr('style'));

      container.wrapInner(content).append(vTrack).append(hTrack);

      vThumb = container.find('.scrollthumb-v');
      vTrack = container.find('.srcolltrack-v');
      hThumb = container.find('.scrollthumb-h');
      hTrack = container.find('.srcolltrack-h');
      content = container.find('.scrollerContent');

      onResize();

          $(window).bind('resize',onResize);

      vTrack.mousedown(handleMouseDown);
      hTrack.mousedown(handleMouseDown);

      $(document).bind({
        mousemove: handleMouseMove,
        mouseup: handleMouseUp
      });

      container.bind({
        DOMMouseScroll: handleMouseScroll,
        mousewheel: handleMouseScroll,
        touchstart: handleTouchStart,
        touchmove: handleTouchMove,
        //keydown: handleKeyDown
      });
    };

    function onResize(){
      content.removeAttr('style');
      container.removeAttr('style');
      vTrack.removeAttr('style');
      hTrack.removeAttr('style');
      var data = container.data('style');
      if(data) container.attr('style', data);
      resize();
    };

    function removeScroll(){
      content = container.find('.scrollerContent');

      container.html(content.html());
      container.removeAttr('style');

      container.unbind('DOMMouseScroll')
           .unbind('mousewheel')
           .unbind('touchstart')
           .unbind('touchmove')
           .unbind('keydown');

      $(window).unbind('resize', onResize);

      $(document).unbind('mousemove', handleMouseMove)
             .unbind('mouseup', handleMouseUp);



      var data = container.data('style');
      if(data) container.attr('style', data);

    };


    ///////////////////////////////////////
    function handleMouseScroll(e,delta, step){
      //e.preventDefault();
      step = step || 80;

      //var e = e || window.event;
      if(isVscroll){
              //var delta = 0;
              if (e.originalEvent.wheelDelta) { delta = e.originalEvent.wheelDelta/120; };
              if (e.originalEvent.detail) { delta = -e.originalEvent.detail / 3; };

              // delta < 0 down;
              // delta > 0 up
              positionTop = getPosition(positionTop, maxTop,delta, step);

        var tmb = vMaxTop * positionTop / maxTop;

        content.stop(true).animate({scrollTop: positionTop}, 200,'linear');
        vThumb.stop(true).animate({ top: tmb}, 200,'linear');
      };

      return false;
    };

    function scrollLeft(delta, step){
      step = step || 80;

      positionLeft = getPosition(positionLeft, maxLeft,delta, step);

      var tmb = hMaxLeft * positionLeft / maxLeft;

      content.stop(true).animate({scrollLeft: positionLeft}, 200,'linear');
      hThumb.stop(true).animate({ left: tmb}, 200,'linear');

    };

    function getPosition(position, max,delta, step){
      if(delta < 0)
        return position + step <= max ? position + step : max;
      else
        return position - step >= 0 ? position - step : 0;
    };

    function handleKeyDown(e){
      switch (e.which) {
        case 40: handleMouseScroll(e, -1); break; //down
        case 38: handleMouseScroll(e, 1);  break; //up
        case 39: scrollLeft(-1); break; //right
        case 37: scrollLeft(1); break; //left

        case 34: handleMouseScroll(e, -1, container.height()); break; //page down
        case 33: handleMouseScroll(e, 1, container.height()); break; //page  up
        case 35: handleMouseScroll(e,-1, scrollHeight); break; //end
        case 36: handleMouseScroll(e, 1, scrollHeight); break; //home
      };

      return true;
    }

    function handleMouseUp(){
      mDown = false;
    };

    function handleMouseDown(e) {
      e.preventDefault();
      var val,
        className = e.target.className,
        isTrack = className.search('srcolltrack') == -1 ? true: false;

      content.stop(true);
      if(className.search("-v") != -1){
        val = e.pageY - container.position().top;

        tmbOffset = isTrack ? val - vThumb.position().top : vThumb.height()/2;

        val -= tmbOffset;
        val = range(val, 0, vMaxTop);

        positionTop = scrollHeight * val / vTrack.height();

        content.animate({ scrollTop: positionTop}, 70,'linear');
        vThumb.css('top',val);

        isBottom = false;
      }else{
        val = e.pageX - container.position().left;
        tmbOffset = isTrack ? val - hThumb.position().left : hThumb.width()/2;

        val -= tmbOffset;
        val = range(val, 0, hMaxLeft);

        positionLeft = scrollWidth * val / hTrack.width();

        content.animate({ scrollLeft: positionLeft}, 70,'linear');
        hThumb.css("left",val);


        isBottom = true;
      };

      mDown = true;
    }


    function range(val, min, max){
      val = Math.max(val,min);
      val = Math.min(val, max);
      return val;
    }


    function handleMouseMove(e){
      if(mDown && !isBottom){
        var y = e.pageY - container.position().top - tmbOffset;

        y = range(y, 0, vMaxTop);

        positionTop = scrollHeight * y / vTrack.height();

        //content.stop();
        content.animate({ scrollTop: positionTop}, 0,'linear');

        vThumb.css('top', y);
      };
      if(mDown && isBottom){
        var x = e.pageX - container.position().left - tmbOffset;

        x = range(x, 0, hMaxLeft);

        var bLeft = scrollWidth * x / hTrack.width();

        //content.stop();
        content.animate({scrollLeft: bLeft}, 0,'linear');

        hThumb.css('left', x);
      };
    };


    function handleTouchStart(e){
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];

      touchstart.top = touch.pageY;
      touchstart.left = touch.pageX;

    }

    function handleTouchMove(e){
      e.preventDefault();
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0],
        y = touchstart.top - touch.pageY + content.scrollTop(),// + tmbOffsetX;
        x = touchstart.left - touch.pageX + content.scrollLeft(),
        frame = {};

      y = range(y, 0, maxTop);
      x = range(x, 0, maxLeft);

      var tmbT = vMaxTop * y / maxTop,
        tmbL = hMaxLeft * x / maxLeft;

      touchstart.top = touch.pageY;
      touchstart.left = touch.pageX;

      vThumb.animate({ top: tmbT},0);
      hThumb.animate({ left: tmbL} ,0);

      if(isVscroll){
        frame['scrollTop'] = y;
      };
      if(isHscroll){
        frame['scrollLeft'] = x;
      };

      content.animate(frame, 0);

    }

    function resize(){

      content.css({
        overflow: 'hidden',
        paddingLeft: container.css('padding-left'),
        paddingRight: container.css('padding-right'),
        paddingTop: container.css('padding-top'),
        paddingBottom: container.css('padding-bottom'),
      } );

      container.css({
        overflow: 'hidden',
        width: container.innerWidth(),
        height: container.innerHeight(),
        padding: 0,
      });

      scrollHeight = content[0].scrollHeight;
      scrollWidth = content[0].scrollWidth;

      var v = false, h = false;

      if(isVscroll && scrollHeight > content.innerHeight()){
        vTrack.show();
        vThumb.css( 'height', Math.pow(content.innerHeight(),2) / scrollHeight);
        v = true;
      }else
        vTrack.css('visibility','hidden');

      if(isHscroll && scrollWidth > content.innerWidth() ){
        hTrack.show();
        hThumb.css( 'width', Math.pow(content.innerWidth(),2)/scrollWidth );
        h = true;
      }else
        hTrack.css('visibility','hidden');

      if(v && h) {
        vTrack.height(vTrack.height() - hTrack.height() - 5);
        hTrack.width(hTrack.width() - vTrack.width() - 5);
      }else{
        vTrack.height(vTrack.height() - parseFloat(vTrack.css('margin-top'))*2);
        hTrack.width(hTrack.width() - parseFloat(hTrack.css('margin-left'))*2);
      };


      maxTop = scrollHeight - content.innerHeight();
      maxLeft = scrollWidth - content.innerWidth();
      vMaxTop = vTrack.height() - vThumb.height();
      hMaxLeft = hTrack.width() - hThumb.width();

      vThumb.css('top', vMaxTop * content.scrollTop() / maxTop);
      hThumb.css('left',hMaxLeft * content.scrollLeft() / maxLeft);

    };

  };
})(jQuery);