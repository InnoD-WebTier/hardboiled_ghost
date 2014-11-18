import re

re.sub(r'\[caption.*?width="(\d+)".*?(<(?P<tag>[a-z]+)\s+.+?</(?P=tag)>(.*?)\[/caption\])', r'\2\n<div class="caption-container" width="\1">\n<span class="caption">\4</span>\n</div>', html)

m = re.match(r'\[caption.*?width="(\d+)".*?(<(?P<tag>[a-z]+)\s+.+?</(?P=tag)>(.*?)\[/caption\])', b)


"""
/\[caption.*?width=["'](\d+)["'].*?(<([a-z]+)\s+.+?(?:\/>)(?:.+?\/\3>)?)\s*(.*?)\[\/caption\]/g
$2\n<div class="caption-container" width="$1">\n<span class="caption">$4</span>\n</div>

/\[caption.*?width=["'](\d+)["'].*?caption=["']([^"']*)["'].*?(<[a-z]+\s+.+?\/>).*?\[\/caption\]/g
$3\n<div class="caption-container" width="$1">\n<span class="caption">$2</span>\n</div>

/(.*?)<(b|em|i|small|strong|sub|sup|ins|del|mark)>([\s\n]*)(.*?)([\s\n]*)<\/\2>(.*)/g
$1$3<strong>$4</strong>$5$6

/(<div.*?>)+(<img.*\/>)(<\/div>)+/g
$2

/<div></div>/g
"""
