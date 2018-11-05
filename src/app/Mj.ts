
namespace lingyu {

    export class Mj {
        fs: FileUtil;
        codec: SourceMapCodec;
        constructor() {
            this.fs = new FileUtil();
            this.codec = new SourceMapCodec();
        }

        merge(projectRoot: string, args: string[]) {

            let url = projectRoot + "/manifest.json";
            var configObj = JSON.parse(this.fs.read(url));

            url = projectRoot + "/tsconfig.json";
            //var tsconfig = JSON.parse(this.fs.read(url));


            let data = "var egret = window.egret;";
            let key = "//# " + "sourceMappingURL=";

            let mapSources: string[] = [];
            let sourceMapps: string[] = [];

            let preLastSegment = new Int16Array([0, 0, 0, 0]);
            for (const item of configObj.game) {
                let fileContent: string = this.fs.read(item);
                let index = fileContent.indexOf(key);
                if (index == -1) {
                    continue;
                }

                let tsName: string = item;

                let spliceList = tsName.split("/");
                if (spliceList.length > 0) {
                    tsName = tsName.replace(spliceList[0] + "/", "");
                }
                tsName = tsName.replace(".js", ".ts");
                fileContent = fileContent.substring(0, index);
                let [map, lastSegment] = this.decodeMap(item, preLastSegment);
                if (map) {
                    mapSources.push(tsName);
                    data += fileContent;
                    preLastSegment = lastSegment;
                    sourceMapps.push(map);
                } else {
                    console.log("empty:" + item)
                }
            }

            let len = sourceMapps.length;
            if (len) {
                let fileName = "main.js";
                data += key + fileName + ".map\n;window.Main = Main;";
                this.fs.save("dist/" + fileName, data);

                //domap;
                let map: SourceMap = { version: 3, file: fileName, sourceRoot: "../src/", sources: mapSources, names: [], mappings: sourceMapps.join(";") };
                data = JSON.stringify(map);
                this.fs.save("dist/" + fileName + ".map", data);
            }
            console.log("merge total:" + len);

            //debug;
            /*let path = "dist/" + fileName + ".map";
            let map2: SourceMap = JSON.parse(this.fs.read(path));
            let test = map2.mappings;
            let decoded = this.codec.decode(test);
            data = JSON.stringify(decoded,);
            this.fs.save("dist/" + fileName + ".json", data);*/
        }

        decodeMap(url: string, preLastSegment: Int16Array): [string, Int16Array] {
            let map: SourceMap = JSON.parse(this.fs.read(url + ".map"));
            let decoded = this.codec.decode(map.mappings);

            let lastSourceLine = 0;
            let lastSegment = new Int16Array(4);
            for (const line of decoded) {
                let len = line.length;
                if (len == 0) {
                    continue;
                }
                for (const segment of line) {
                    //旧值保留起来
                    lastSegment[1] = 1;
                    lastSegment[2] = segment[2];
                    lastSegment[3] = segment[3];

                    segment[1] = preLastSegment[1];
                    segment[2] -= preLastSegment[2];
                    segment[3] -= preLastSegment[3];
                }
            }

            return [this.codec.encode(decoded), lastSegment];
        }
    }
}


let projectRoot = process.cwd();
let mj = new lingyu.Mj();
mj.merge(projectRoot, process.argv.slice(2));