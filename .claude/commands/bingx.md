Signature Authentication
Generate an API Key
To access private endpoints, you must create an API Key on the BingX website under User Center → API Management.
After creation, you will receive an API Key and a Secret Key. Please keep them secure.
For security reasons, it is strongly recommended to configure an IP whitelist.
Never disclose your API Key or Secret Key. If leaked, delete it immediately and create a new one.
Permission Settings
Newly created API Keys have read-only permission by default.
To place orders or perform other write operations, please enable the corresponding permissions in the UI.
Request Requirements
All authenticated REST requests must include:
X-BX-APIKEY in the request header.
signature as a request parameter, calculated using the signature algorithm.
timestamp (milliseconds) as the request time. Requests outside the allowed time window (default 5000ms) will be rejected. The window can be adjusted using recvWindow.
Signature Description
The signature is generated using HMAC-SHA256 and returned as a 64-character lowercase hexadecimal string.
The signing and request construction rules are as follows:
1. Collect all business parameters (excluding signature).
2. Generate timestamp (milliseconds) and include it as a normal parameter.
3. Sort all parameters (business parameters + timestamp) by key in ASCII ascending order.
4. Build the signing string:
key=value&key2=value2&...&timestamp=xxx
Parameter values must NOT be URL-encoded here.
5. Use secretKey to calculate HMAC-SHA256 over the signing string to obtain the signature.
URL Encoding Rules (Query String Only)
These rules apply only to query string parameters:
The signature is always calculated from the unencoded signing string.
If the signing string contains '[' or '{', URL-encode only parameter values in the actual request URL.
Do not encode parameter keys.
Use UTF-8 encoding and encode spaces as %20.
If the signing string does not contain '[' or '{', values do not need URL encoding.
Query String Example
Example parameters:
symbol=BTC-USDT
recvWindow=0
timestamp=1696751141337
Sorted signing string:
recvWindow=0&symbol=BTC-USDT×tamp=1696751141337
Generate signature:
echo -n 'recvWindow=0&symbol=BTC-USDT×tamp=1696751141337' | openssl dgst -sha256 -hmac 'SECRET_KEY' -hex
Send request:
https://open-api.bingx.com/xxx?recvWindow=0&symbol=BTC-USDT×tamp=1696751141337&signature=...
Batch Order Query String Example
Example request URL:
https://open-api.bingx.com/openApi/spot/v1/trade/batchOrders?data=%5B%7B%22symbol%22%3A%22BTC-USDT%22%2C%22side%22%3A%22BUY%22%2C%22type%22%3A%22LIMIT%22%2C%22quantity%22%3A0.001%2C%22price%22%3A85000%2C%22newClientOrderId%22%3A%22%22%7D%2C%7B%22symbol%22%3A%22BTC-USDT%22%2C%22side%22%3A%22BUY%22%2C%22type%22%3A%22LIMIT%22%2C%22quantity%22%3A0.001%2C%22price%22%3A42000%2C%22newClientOrderId%22%3A%22%22%7D%5D&recvWindow=60000×tamp=1766679008165&signature=87bd22cfb380dddf8ce6d2901be7f107fef23dcf1e3d066e1519d1daa8fa81c6
Request Body Example
The following example applies to endpoints that require application/json and read parameters from the request body.
Signature parameters (timestamp / signature) must be included in the request body. Do not append them to the URL query.
Example business parameters:
{
"recvWindow": 10000,
"symbol": "ETH-USDT",
"type": "MARKET",
"side": "SELL",
"positionSide": "SHORT",
"quantity": 0.01
}
Example request body:
{
"recvWindow": 10000,
"symbol": "ETH-USDT",
"type": "MARKET",
"side": "SELL",
"positionSide": "SHORT",
"quantity": 0.01,
"timestamp": 1696751141337,
"signature": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
Endpoints Using Request Body
The following endpoints use application/json format and send parameters via request body:
Create Sub-account - POST /openApi/subAccount/v1/create
Create Sub-account API Key - POST /openApi/subAccount/v1/apiKey/create
Edit Sub-Account API Key - POST /openApi/subAccount/v1/apiKey/edit
Delete Sub-Account API Key - POST /openApi/subAccount/v1/apiKey/del
Update Sub-account Status (Freeze/Unfreeze) - POST /openApi/subAccount/v1/updateStatus
Query Sub-Mother Account Transferable Amount - POST /openApi/account/transfer/v1/subAccount/transferAsset/supportCoins
Sub-Mother Account Asset Transfer - POST /openApi/account/transfer/v1/subAccount/transferAsset
Success
An HTTP 200 status code indicates a successful response. The response body, if present, will be returned in JSON format.


GET
/openApi/spot/v1/account/balance
(Query Assets)
Copy
Request Type GET
UID Rate Limit 5/second / UID
Signature Verification: Yes
Applicable Accounts: Master and Sub Accounts
API Key Permission: Read
Endpoint description: Query Assets
host
PROD
https://open-api.bingx.com
VST
https://open-api-vst.bingx.com
REQUEST PARAMETER
recvWindow
int64
No
Timestamp of initiating the request, Unit: milliseconds
timestamp
int64
Yes
Request valid time window value, Unit: milliseconds
response body
balances
Array
Asset list, element fields refer to the following table
Request Example
{
  "recvWindow": "60000"
}
Response Example
{
  "code": 0,
  "msg": "",
  "debugMsg": "",
  "data": {
    "balances": [
      {
        "asset": "USDT",
        "free": "566773.193402631",
        "locked": "244.18616265388994"
      },
      {
        "asset": "CHEEMS",
        "free": "294854132046232",
        "locked": "18350553840"
      },
      {
        "asset": "VST",
        "free": "0",
        "locked": "0"
      }
    ]
  }
}
error code
No Data
Code Example
PythonGolangNode.jsJavaC#PHPShell

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.util.Map;
import java.util.TreeMap;

public class TradeDemo {

    private String url = "https://open-api.bingx.com";
    private String apiKey = "";
    private String secretKey = "";

    private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();

    public static void main(String[] args) {
        TradeDemo h = new TradeDemo();
        String method = "GET";
        String path = "/openApi/spot/v1/account/balance";
        TreeMap<String, String> parameters = new TreeMap<String, String>();
        
        payloadParams.put("recvWindow", "60000");
        long timestamp = System.currentTimeMillis();
        parameters.put("timestamp", String.valueOf(timestamp));
        String valueToDigest = h.getMessageToDigest(method, path, parameters);
        String messageDigest = h.generateHmac256(valueToDigest);
        String requestUrl = h.getRequestUrlWithEncoding(path, parameters, messageDigest);
        h.execute(requestUrl, method);
    }
    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }

    byte[] hmac(String algorithm, byte[] key, byte[] message) throws Exception {
        Mac mac = Mac.getInstance(algorithm);
        mac.init(new SecretKeySpec(key, algorithm));
        return mac.doFinal(message);
    }

    String generateHmac256(String message) {
        try {
            byte[] bytes = hmac("HmacSHA256", secretKey.getBytes(), message.getBytes());
            String signature = bytesToHex(bytes);
            System.out.println("sign=" + signature);
            return signature;
        } catch (Exception e) {
            System.out.println("generateHmac256 expection:" + e);
        }
        return "";
    }

    String getMessageToDigest(String method, String path, TreeMap<String, String> parameters) {
        Boolean first = true;
        String valueToDigest = "";
        for (Map.Entry<String, String> e : parameters.entrySet()) {
            if (!first) {
                valueToDigest += "&";
            }
            first = false;
            String key = e.getKey();
            String value = e.getValue();
            valueToDigest += key + "=" + value;
        }
        return valueToDigest;
    }
    
    String getRequestUrlWithEncoding(String path, TreeMap<String, String> parameters, String signature) {
        String valueToDigest = getMessageToDigest("", path, parameters);
        boolean contains = valueToDigest.contains("[") || valueToDigest.contains("{");
        Boolean first = true;
        String paramsStr = "";
        for (Map.Entry<String, String> e : parameters.entrySet()) {
            if (!first) {
                paramsStr += "&";
            }
            first = false;
            String key = e.getKey();
            String value = e.getValue();
            if (contains) {
                try {
                    value = java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20");
                } catch (Exception ex) {
                    // ignore
                }
            }
            paramsStr += key + "=" + value;
        }
        paramsStr += "&signature=" + signature;
        String urlStr = url + path + "?" + paramsStr;
        System.out.println(urlStr);
        return urlStr;
    }

    void execute(String requestUrl, String method) {
        try {
            URL urlObj = new URL(requestUrl);
            URLConnection conn = urlObj.openConnection();
            HttpURLConnection http = (HttpURLConnection) conn;
            http.setRequestMethod(method);
            http.addRequestProperty("X-BX-APIKEY", apiKey);
            http.addRequestProperty("User-Agent","Mozilla/5.0");
            http.setDoOutput(true);
            conn.setDoOutput(true);
            conn.setDoInput(true);

            String result = "";
            String line = "";
            BufferedReader in = new BufferedReader(
                    new InputStreamReader(conn.getInputStream()));
            while ((line = in.readLine()) != null) {
                result += line;
            }

            System.out.println("demo: " + result);

        } catch (Exception e) {
            System.out.println("expection:" + e);
        }
    } 
}

