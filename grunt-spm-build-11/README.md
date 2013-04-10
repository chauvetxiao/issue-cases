我这个主要是关于构建的问题：

按照配置将src中 logic.js 进行构建后输出的代码只有一行
define("spm/test/1.0.0/logic",["box/1.0.0/box.js","stat"],function(o){var b=o("box/1.0.0/box.js");b.box()});

和我预期的不一样,主要有这样几个疑问：
1、照理说在logic.js中require了box，box代码中require了stat组件，那么在最终生成的logic.js中应该包含这两个文件的源码才对呢，不然怎样起到合并请求的作用呢；
2、在业务脚本中很多情况是想直接使用 seajs.use([...],function(){....}) 这样的脚本，
但是这种格式的写法在构建的时候直接报错： Cannot read property 'id' of undefined Use --force to continue
3、构建后的require被替换为了o，我疑惑这还能正常运行吗

