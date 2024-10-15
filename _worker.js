/**
 * Telegram Group: https://t.me/AM_CLUBS
 * YouTube Channel: https://youtube.com/@AM_CLUB
 * GitHub Repository: https://github.com/amclubs
 * Personal Blog: https://am.809098.xyz
 */

let myToken = 'pwd';

export default {
    async fetch(request, env) {
        myToken = env.TOKEN || myToken;
        const KV = env.KV;

        if (!KV) {
            return createResponse('KV namespace is not bound', 400);
        }

        const url = new URL(request.url);
        const token = url.pathname === `/${myToken}` ? myToken : url.searchParams.get('token') || "null";

        if (token !== myToken) {
            return createResponse('Invalid token', 400);
        }

        const fileName = url.pathname.slice(1) || '';
        switch (fileName) {
            case "config":
            case myToken:
                return createResponse(configHTML(url.hostname, token), 200, 'text/html; charset=UTF-8');
            case "config/update.ps1":
                return createFileResponse(downloadScript('ps1', url.hostname, token), 'update.ps1');
            case "config/update.sh":
                return createFileResponse(downloadScript('sh', url.hostname, token), 'update.sh');
            default:
                return await handleFileOperation(KV, fileName, request);
        }
    }
};

async function handleFileOperation(KV, fileName, request) {

    if (request.method === "POST") {
        // POST 请求，修改文件内容
        const text = (await request.text())?.trim() || ""

        const valueToStore = text === "" ? "" : base64Decode(replaceSpaceWithPlus(text));

        await fileExists(KV, fileName);
        await KV.put(fileName, valueToStore);
        return createResponse(valueToStore, 200, 'text/plain; charset=utf-8');
    } else {
        // 非 POST 请求，返回文件内容
        const value = await KV.get(fileName);
        
        return createResponse(value || '', 200, 'text/plain; charset=utf-8');
    }
}

async function fileExists(KV, filename) {
    return await KV.get(filename) !== null;
}

function base64Decode(str) {
    return new TextDecoder('utf-8').decode(Uint8Array.from(atob(str), c => c.charCodeAt(0)));
}

function replaceSpaceWithPlus(str) {
    return str.replace(/ /g, '+');
}

function createResponse(body, status, contentType = 'text/plain; charset=utf-8') {
    return new Response(body, {
        status,
        headers: { 'content-type': contentType },
    });
}

function createFileResponse(content, filename) {
    return new Response(content, {
        headers: {
            "Content-Disposition": `attachment; filename=${filename}`,
            "content-type": "text/plain; charset=utf-8",
        },
    });
}

function downloadScript(type, domain, token) {
    if (type === 'ps1') {
        return `
$DOMAIN="${domain}"
$TOKEN="${token}"

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()

$filePicker = New-Object System.Windows.Forms.OpenFileDialog

Write-Host "选择要上传的文件\`n"

$res = $filePicker.ShowDialog()

if ($res -eq "OK") {
    $filePath = $filePicker.FileName
    $fileName = [System.IO.Path]::GetFileName("$filePath")
    $content = (Get-Content -Path "$filePath" -Encoding UTF8) -join [Environment]::NewLine
    $base64 = [convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
    $url = "https://$DOMAIN/$fileName" + "?token=$TOKEN"

    try {
        Invoke-WebRequest $url -Method POST -Body $base64 | Out-Null
        Write-Host "上传成功\`n"
    } catch {
        $errorMessage = $_.ErrorDetails.Message
        Write-Host "上传失败：$errorMessage\`n"
    }

    Write-Host "5秒后退出"
    Start-Sleep -s 5
}

        `;
    } else if (type === 'sh') {
        return `#!/bin/bash
export LANG=zh_CN.UTF-8
DOMAIN="${domain}"
TOKEN="${token}"

if [ -n "$1" ]; then 
  FILENAME="$1"
else
  echo "未输入要上传的文件\n"
  exit 1
fi

BASE64_TEXT=$(cat "$FILENAME" | base64 -w 0)

URL="https://$DOMAIN/$FILENAME?token=$TOKEN"

response=$(curl -o /dev/null  -s -d "$BASE64_TEXT" -X POST $URL -w '%{http_code} %{errormsg}')

[[ $response =~ ((^[0-9]+) (.*)) ]]

http_code=\$\{BASH_REMATCH[2]\}

errormsg=\$\{BASH_REMATCH[3]\}

if [ $http_code = "200" ];then
  echo -e "上传成功\n"
else
  echo -e "上传失败: $errormsg\n"
fi

`;
    }
}

function configHTML(domain, token) {
    return `
    <html>
        <head>
            <title>am-cf-text2kv</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    text-align: left; /* 全部文本左对齐 */
                }
                h1 {
                    margin-top: 20px;
                    font-size: 24px;
                }
                pre {
                    background: #f4f4f4;
                    padding: 10px;
                    border-radius: 5px;
                    text-align: left;
                    margin: 0;
                }
                button {
                    padding: 8px 12px;
                    margin: 5px;
                    cursor: pointer;
                }
                input {
                    padding: 8px;
                    width: 300px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <b style='font-size: 15px;'>如果您觉得这个项目有用，请访问我们的GitHub项目并给我们点赞:</b>
            <a href='https://github.com/amclubs/am-cf-text2kv' target='_blank'>am-cf-text2kv</a>
            <iframe src='https://ghbtns.com/github-btn.html?user=amclubs&repo=am-cf-text2kv&type=star&count=true&size=large' frameborder='0' scrolling='0' width='170' height='30' title='GitHub'></iframe>
            <h1>am-cf-text2kv 配置信息</h1>
            <p>
                域名: <strong>${domain}</strong> <br>
                Token: <strong>${token}</strong> <br><br>
                <pre>注意! URL长度内容所限，脚本更新方式一次最多更新65行内容</pre><br>
                Windows脚本:  
                <button type="button" onclick="window.open('https://${domain}/config/update.ps1?token=${token}', '_blank')">点击下载</button><br>
                <pre>使用方法: <code>双击运行</code></pre><br>
                Linux脚本:  
                <code>&lt;curl&nbsp;https://${domain}/config/update.sh?token=${token}&nbsp;-o&nbsp;update.sh&nbsp;&&&nbsp;chmod&nbsp;+x&nbsp;update.sh&gt;</code><br>
                <pre>使用方法: <code>&lt;./update.sh&nbsp;ip.txt&gt;</code></pre><br><br>
                在线查询: <br>
                https://${domain}/<input type="text" name="keyword" placeholder="请输入查询的文件名">?token=${token}<br>
                <button type="button" onclick="window.open('https://${domain}/' + document.querySelector('input[name=keyword]').value + '?token=${token}', '_blank')">查看文件内容</button>
                <button type="button" onclick="navigator.clipboard.writeText('https://${domain}/' + document.querySelector('input[name=keyword]').value + '?token=${token}')">复制文件地址</button>
            </p>
        </body>
    </html>
    `;
}
