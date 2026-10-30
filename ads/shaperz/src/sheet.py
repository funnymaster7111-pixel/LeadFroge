import sys
from PIL import Image
ims=[Image.open(p) for p in sys.argv[2:]]
h=960; ims=[i.resize((int(i.width*h/i.height),h)) for i in ims]
out=Image.new('RGB',(sum(i.width for i in ims)+20*len(ims),h),'white'); x=0
for i in ims: out.paste(i,(x,0)); x+=i.width+20
out.save(sys.argv[1])
