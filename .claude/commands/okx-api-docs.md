API key Creation
Please refer to my api page regarding API Key creation.

Generating an API key
Create an API key on the website before signing any requests. After creating an API key, keep the following information safe:

API key
Secret key
Passphrase
The system returns randomly-generated API keys and SecretKeys. You will need to provide the Passphrase to access the API. We store the salted hash of your Passphrase for authentication. We cannot recover the Passphrase if you have lost it. You will need to create a new set of API key.


API key permissions
There are three permissions below that can be associated with an API key. One or more permission can be assigned to any key.

Read : Can request and view account info such as bills and order history which need read permission
Trade : Can place and cancel orders, funding transfer, make settings which need write permission
Withdraw : Can make withdrawals
API key security
 To improve security, we strongly recommend clients linked the API key to IP addresses
Each API key can bind up to 20 IP addresses, which support IPv4/IPv6 and network segment formats.
 API keys that are not linked to an IP address and have `trade` or `withdraw` permissions will expire after 14 days of inactivity. (The API key of demo trading will not expire)
Only when the user calls an API that requires API key authentication will it be considered as the API key is used.
Calling an API that does not require API key authentication will not be considered used even if API key information is passed in.
For websocket, only operation of logging in will be considered to have used the API key. Any operation though the connection after logging in (such as subscribing/placing an order) will not be considered to have used the API key. Please pay attention.
Users can get the usage records of the API key with trade or withdraw permissions but unlinked to any IP address though Security Center.

REST Authentication
Making Requests
All private REST requests must contain the following headers:

OK-ACCESS-KEY The API key as a String.

OK-ACCESS-SIGN The Base64-encoded signature (see Signing Messages subsection for details).

OK-ACCESS-TIMESTAMP The UTC timestamp of your request .e.g : 2020-12-08T09:08:57.715Z

OK-ACCESS-PASSPHRASE The passphrase you specified when creating the API key.

Request bodies should have content type application/json and be in valid JSON format.

Signature
Signing Messages

The OK-ACCESS-SIGN header is generated as follows:

Create a pre-hash string of timestamp + method + requestPath + body (where + represents String concatenation).
Prepare the SecretKey.
Sign the pre-hash string with the SecretKey using the HMAC SHA256.
Encode the signature in the Base64 format.
Example: sign=CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(timestamp + 'GET' + '/api/v5/account/balance?ccy=BTC', SecretKey))

The timestamp value is the same as the OK-ACCESS-TIMESTAMP header with millisecond ISO format, e.g. 2020-12-08T09:08:57.715Z.

The request method should be in UPPERCASE: e.g. GET and POST.

The requestPath is the path of requesting an endpoint.

Example: /api/v5/account/balance

The body refers to the String of the request body. It can be omitted if there is no request body (frequently the case for GET requests).

Example: {"instId":"BTC-USDT","lever":"5","mgnMode":"isolated"}

 `GET` request parameters are counted as requestpath, not body
The SecretKey is generated when you create an API key.

Example: 22582BD0CFF14C41EDBF1AB98506286D

Account mode
To facilitate your trading experience, please set the appropriate account mode before starting trading.

In the trading account trading system, 4 account modes are supported: Spot mode, Futures mode, Multi-currency margin mode, and Portfolio margin mode.

You need to set on the Web/App for the first set of every account mode.

Production Trading Services
The Production Trading URL:

REST: https://www.okx.com
Public WebSocket: wss://ws.okx.com:8443/ws/v5/public
Private WebSocket: wss://ws.okx.com:8443/ws/v5/private
Business WebSocket: wss://ws.okx.com:8443/ws/v5/business
Demo Trading Services
Currently, the API works for Demo Trading, but some functions are not supported, such as withdraw,deposit,purchase/redemption, etc.

The Demo Trading URL:

REST: https://www.okx.com
Public WebSocket: wss://wspap.okx.com:8443/ws/v5/public
Private WebSocket: wss://wspap.okx.com:8443/ws/v5/private
Business WebSocket: wss://wspap.okx.com:8443/ws/v5/business
OKX account can be used for login on Demo Trading. If you already have an OKX account, you can log in directly.

Start API Demo Trading by the following steps:
Login OKX —> Trade —> Demo Trading —> Personal Center —> Demo Trading API -> Create Demo Trading API Key —> Start your Demo Trading

 Note: `x-simulated-trading: 1` needs to be added to the header of the Demo Trading request.
Http Header Example

Content-Type: application/json

OK-ACCESS-KEY: 37c541a1-****-****-****-10fe7a038418

OK-ACCESS-SIGN: leaVRETrtaoEQ3yI9qEtI1CZ82ikZ4xSG5Kj8gnl3uw=

OK-ACCESS-PASSPHRASE: 1****6

OK-ACCESS-TIMESTAMP: 2020-03-28T12:21:41.274Z

x-simulated-trading: 1
Demo Trading Explorer
You need to sign in to your OKX account before accessing the explorer. The interface only allow access to the demo trading environment.

Clicking Try it out button in Parameters Panel and editing request parameters.

Clicking Execute button to send your request. You can check response in Responses panel.

Try demo trading explorer

General Info
The rules for placing orders at the exchange level are as follows:

The maximum number of pending orders (including post only orders, limit orders and taker orders that are being processed): 4,000
The maximum number of pending orders per trading symbol is 500, the limit of 500 pending orders applies to the following order types:

Limit
Market
Post only
Fill or Kill (FOK)
Immediate or Cancel (IOC)
Market order with Immediate-or-Cancel order (optimal limit IOC)
Take Profit / Stop Loss (TP/SL)
Limit and market orders triggered under the order types below:
Take Profit / Stop Loss (TP/SL)
Trigger
Trailing stop
Arbitrage
Iceberg
TWAP
Recurring buy
The maximum number of pending spread orders: 500 across all spreads

The maximum number of pending algo orders:

TP/SL order: 100 per instrument
Trigger order: 500
Trailing order: 50
Iceberg order: 100
TWAP order: 20
The maximum number of grid trading

Spot grid: 100
Contract grid: 100


The rules for trading are as follows:

When the number of maker orders matched with a taker order exceeds the maximum number limit of 1000, the taker order will be canceled.
The limit orders will only be executed with a portion corresponding to 1000 maker orders and the remainder will be canceled.
Fill or Kill (FOK) orders will be canceled directly.


The rules for the returning data are as follows:

code and msg represent the request result or error reason when the return data has code, and has not sCode;

It is sCode and sMsg that represent the request result or error reason when the return data has sCode rather than code and msg.



instFamily and uly parameter explanation:

The following explanation is based on the BTC contract, other contracts are similar.
uly is the index, like "BTC-USD", and there is a one-to-many relationship with the settlement and margin currency (settleCcy).
instFamily is the trading instrument family, like BTC-USD_UM, and there is a one-to-one relationship with the settlement and margin currency (settleCcy).
The following table shows the corresponding relationship of uly, instFamily, settleCcy and instId.
Contract Type	uly	instFamily	settleCcy	Delivery contract instId	Swap contract instId
USDT-margined contract	BTC-USDT	BTC-USDT	USDT	BTC-USDT-250808	BTC-USDT-SWAP
USDC-margined contract	BTC-USDC	BTC-USDC	USDC	BTC-USDC-250808	BTC-USDC-SWAP
USD-margined contract	BTC-USD	BTC-USD_UM	USDⓈ	BTC-USD_UM-250808	BTC-USD_UM-SWAP
Coin-margined contract	BTC-USD	BTC-USD	BTC	BTC-USD-250808	BTC-USD-SWAP
Note:
1. USDⓈ represents USD and multiple USD stable coins, like USDC, USDG.
2. The settlement and margin currency refers to the settleCcy field returned by the Get instruments endpoint.

Transaction Timeouts
Orders may not be processed in time due to network delay or busy OKX servers. You can configure the expiry time of the request using expTime if you want the order request to be discarded after a specific time.

If expTime is specified in the requests for Place (multiple) orders or Amend (multiple) orders, the request will not be processed if the current system time of the server is after the expTime.

REST API
Set the following parameters in the request header

Parameter	Type	Required	Description
expTime	String	No	Request effective deadline. Unix timestamp format in milliseconds, e.g. 1597026383085
The following endpoints are supported:

Place order
Place multiple orders
Amend order
Amend multiple orders
POST / Place sub order under signal bot trading
Request Example

curl -X 'POST' \
  'https://www.okx.com/api/v5/trade/order' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'OK-ACCESS-KEY: *****' \
  -H 'OK-ACCESS-SIGN: *****'' \
  -H 'OK-ACCESS-TIMESTAMP: *****'' \
  -H 'OK-ACCESS-PASSPHRASE: *****'' \
  -H 'expTime: 1597026383085' \   // request effective deadline
  -d '{
  "instId": "BTC-USDT",
  "tdMode": "cash",
  "side": "buy",
  "ordType": "limit",
  "px": "1000",
  "sz": "0.01"
}'
WebSocket
Get positions
Retrieve information on your positions. When the account is in net mode, net positions will be displayed, and when the account is in long/short mode, long or short positions will be displayed. Return in reverse chronological order using ctime.

Rate Limit: 10 requests per 2 seconds
Rate limit rule: User ID
Permission: Read
HTTP Request
GET /api/v5/account/positions

Request Example

# Query BTC-USDT position information
GET /api/v5/account/positions?instId=BTC-USDT

Request Parameters
Parameter	Type	Required	Description
instType	String	No	Instrument type
MARGIN
SWAP
FUTURES
OPTION
instId will be checked against instType when both parameters are passed.
instId	String	No	Instrument ID, e.g. BTC-USDT-SWAP. Single instrument ID or multiple instrument IDs (no more than 10) separated with comma
posId	String	No	Single position ID or multiple position IDs (no more than 20) separated with comma.
There is attribute expiration, the posId and position information will be cleared if it is more than 30 days after the last full close position.
 instId
If the instrument ever had position and its open interest is 0, it will return the position information with specific instId. It will not return the position information with specific instId if there is no valid posId; it will not return the position information without specific instId.
 In the isolated margin trading settings, if it is set to the manual transfers mode, after the position is transferred to the margin, a position with a position of 0 will be generated
Response Example

{
    "code": "0",
    "data": [
        {
            "adl": "1",
            "availPos": "0.00190433573",
            "avgPx": "62961.4",
            "baseBal": "",
            "baseBorrowed": "",
            "baseInterest": "",
            "bePx": "",
            "bizRefId": "",
            "bizRefType": "",
            "cTime": "1724740225685",
            "ccy": "BTC",
            "clSpotInUseAmt": "",
            "closeOrderAlgo": [],
            "deltaBS": "",
            "deltaPA": "",
            "fee": "",
            "fundingFee": "",
            "gammaBS": "",
            "gammaPA": "",
            "hedgedPos": "",
            "idxPx": "62890.5",
            "imr": "",
            "instId": "BTC-USDT",
            "instType": "MARGIN",
            "interest": "0",
            "last": "62892.9",
            "lever": "5",
            "liab": "-99.9998177776581948",
            "liabCcy": "USDT",
            "liqPenalty": "",
            "liqPx": "53615.448336593756",
            "margin": "0.000317654",
            "markPx": "62891.9",
            "maxSpotInUseAmt": "",
            "mgnMode": "isolated",
            "mgnRatio": "9.404143929947395",
            "mmr": "0.0000318005395854",
            "notionalUsd": "119.756628017499",
            "optVal": "",
            "pendingCloseOrdLiabVal": "0",
            "pnl": "",
            "pos": "0.00190433573",
            "posCcy": "BTC",
            "posId": "1752810569801498626",
            "posSide": "net",
            "quoteBal": "",
            "quoteBorrowed": "",
            "quoteInterest": "",
            "realizedPnl": "",
            "spotInUseAmt": "",
            "spotInUseCcy": "",
            "thetaBS": "",
            "thetaPA": "",
            "tradeId": "785524470",
            "uTime": "1724742632153",
            "upl": "-0.0000033452492717",
            "uplLastPx": "-0.0000033199677697",
            "uplRatio": "-0.0105311101755551",
            "uplRatioLastPx": "-0.0104515220008934",
            "usdPx": "",
            "vegaBS": "",
            "vegaPA": "",
            "nonSettleAvgPx":"",
            "settledPnl":""
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instType	String	Instrument type
mgnMode	String	Margin mode
cross
isolated
posId	String	Position ID
posSide	String	Position side
long, pos is positive
short, pos is positive
net (FUTURES/SWAP/OPTION: positive pos means long position and negative pos means short position. For MARGIN, pos is always positive, posCcy being base currency means long position, posCcy being quote currency means short position.)
pos	String	Quantity of positions. In the isolated margin mode, when doing manual transfers, a position with pos of 0 will be generated after the deposit is transferred
hedgedPos	String	Hedged position size
Only return for accounts in delta neutral strategy, stgyType:1. Return "" for accounts in general strategy.
baseBal	String	Base currency balance, only applicable to MARGIN（Quick Margin Mode）(Deprecated)
quoteBal	String	Quote currency balance, only applicable to MARGIN（Quick Margin Mode）(Deprecated)
baseBorrowed	String	Base currency amount already borrowed, only applicable to MARGIN(Quick Margin Mode）(Deprecated)
baseInterest	String	Base Interest, undeducted interest that has been incurred, only applicable to MARGIN(Quick Margin Mode）(Deprecated)
quoteBorrowed	String	Quote currency amount already borrowed, only applicable to MARGIN(Quick Margin Mode）(Deprecated)
quoteInterest	String	Quote Interest, undeducted interest that has been incurred, only applicable to MARGIN(Quick Margin Mode）(Deprecated)
posCcy	String	Position currency, only applicable to MARGIN positions.
availPos	String	Position that can be closed
Only applicable to MARGIN and OPTION.
For MARGIN position, the rest of sz will be SPOT trading after the liability is repaid while closing the position. Please get the available reduce-only amount from "Get maximum available tradable amount" if you want to reduce the amount of SPOT trading as much as possible.
avgPx	String	Average open price
Under cross-margin mode, the entry price of expiry futures will update at settlement to the last settlement price, and when the position is opened or increased.
nonSettleAvgPx	String	Non-settlement entry price
The non-settlement entry price only reflects the average price at which the position is opened or increased.
Applicable to cross FUTURES positions.
markPx	String	Latest Mark price
upl	String	Unrealized profit and loss calculated by mark price.
uplRatio	String	Unrealized profit and loss ratio calculated by mark price.
uplLastPx	String	Unrealized profit and loss calculated by last price. Main usage is showing, actual value is upl.
uplRatioLastPx	String	Unrealized profit and loss ratio calculated by last price.
instId	String	Instrument ID, e.g. BTC-USDT-SWAP
lever	String	Leverage
Not applicable to OPTION and positions of cross margin mode under Portfolio margin
liqPx	String	Estimated liquidation price
Not applicable to OPTION
imr	String	Initial margin requirement, only applicable to cross.
margin	String	Margin, can be added or reduced. Only applicable to isolated.
mgnRatio	String	Maintenance margin ratio
mmr	String	Maintenance margin requirement
liab	String	Liabilities, only applicable to MARGIN.
liabCcy	String	Liabilities currency, only applicable to MARGIN.
interest	String	Interest. Undeducted interest that has been incurred.
tradeId	String	Last trade ID
optVal	String	Option Value, only applicable to OPTION.
pendingCloseOrdLiabVal	String	The amount of close orders of isolated margin liability.
notionalUsd	String	Notional value of positions in USD
adl	String	Auto-deleveraging (ADL) indicator
Divided into 6 levels, from 0 to 5, the smaller the number, the weaker the adl intensity.
Only applicable to FUTURES/SWAP/OPTION
ccy	String	Currency used for margin
last	String	Latest traded price
idxPx	String	Latest underlying index price
usdPx	String	Latest USD price of the ccy on the market, only applicable to FUTURES/SWAP/OPTION
bePx	String	Breakeven price
deltaBS	String	delta: Black-Scholes Greeks in dollars, only applicable to OPTION
deltaPA	String	delta: Greeks in coins, only applicable to OPTION
gammaBS	String	gamma: Black-Scholes Greeks in dollars, only applicable to OPTION
gammaPA	String	gamma: Greeks in coins, only applicable to OPTION
thetaBS	String	theta：Black-Scholes Greeks in dollars, only applicable to OPTION
thetaPA	String	theta：Greeks in coins, only applicable to OPTION
vegaBS	String	vega：Black-Scholes Greeks in dollars, only applicable to OPTION
vegaPA	String	vega：Greeks in coins, only applicable to OPTION
spotInUseAmt	String	Spot in use amount
Applicable to Portfolio margin
spotInUseCcy	String	Spot in use unit, e.g. BTC
Applicable to Portfolio margin
clSpotInUseAmt	String	User-defined spot risk offset amount
Applicable to Portfolio margin
maxSpotInUseAmt	String	Max possible spot risk offset amount
Applicable to Portfolio margin
bizRefId	String	External business id, e.g. experience coupon id
bizRefType	String	External business type
realizedPnl	String	Realized profit and loss
Only applicable to FUTURES/SWAP/OPTION
realizedPnl=pnl+fee+fundingFee+liqPenalty+settledPnl
settledPnl	String	Accumulated settled profit and loss (calculated by settlement price)
Only applicable to cross FUTURES
pnl	String	Accumulated pnl of closing order(s) (excluding the fee).
fee	String	Accumulated fee
Negative number represents the user transaction fee charged by the platform.Positive number represents rebate.
fundingFee	String	Accumulated funding fee
liqPenalty	String	Accumulated liquidation penalty. It is negative when there is a value.
closeOrderAlgo	Array of objects	Close position algo orders attached to the position. This array will have values only after you request "Place algo order" with closeFraction=1.
> algoId	String	Algo ID
> slTriggerPx	String	Stop-loss trigger price.
> slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
> tpTriggerPx	String	Take-profit trigger price.
> tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
> closeFraction	String	Fraction of position to be closed when the algo order is triggered.
cTime	String	Creation time, Unix timestamp format in milliseconds, e.g. 1597026383085
uTime	String	Latest time position was adjusted, Unix timestamp format in milliseconds, e.g. 1597026383085
As for portfolio margin account, the IMR and MMR of the position are calculated in risk unit granularity, thus their values of the same risk unit cross positions are the same.

Get positions history
Retrieve the updated position data for the last 3 months. Return in reverse chronological order using utime. Getting positions history is supported under Portfolio margin mode since 04:00 AM (UTC) on November 11, 2024.

Rate Limit: 10 requests per 2 seconds
Rate limit rule: User ID
Permission: Read
HTTP Request
GET /api/v5/account/positions-history

Request Example

GET /api/v5/account/positions-history
Request Parameters
Parameter	Type	Required	Description
instType	String	No	Instrument type
MARGIN
SWAP
FUTURES
OPTION
instId	String	No	Instrument ID, e.g. BTC-USD-SWAP
mgnMode	String	No	Margin mode
cross isolated
type	String	No	The type of latest close position
1: Close position partially;2：Close all;3：Liquidation;4：Partial liquidation; 5：ADL - position not fully closed; 6：ADL - position fully closed
It is the latest type if there are several types for the same position.
posId	String	No	Position ID. There is attribute expiration. The posId will be expired if it is more than 30 days after the last full close position, then position will use new posId.
after	String	No	Pagination of data to return records earlier than the requested uTime, Unix timestamp format in milliseconds, e.g. 1597026383085
before	String	No	Pagination of data to return records newer than the requested uTime, Unix timestamp format in milliseconds, e.g. 1597026383085
limit	String	No	Number of results per request. The maximum is 100. The default is 100. All records that have the same uTime will be returned at the current request
Response Example

{
    "code": "0",
    "data": [
        {
            "cTime": "1654177169995",
            "ccy": "BTC",
            "closeAvgPx": "29786.5999999789081085",
            "closeTotalPos": "1",
            "instId": "BTC-USD-SWAP",
            "instType": "SWAP",
            "lever": "10.0",
            "mgnMode": "cross",
            "openAvgPx": "29783.8999999995535393",
            "openMaxPos": "1",
            "realizedPnl": "0.001",
            "fee": "-0.0001",
            "fundingFee": "0",
            "liqPenalty": "0",
            "pnl": "0.0011",
            "pnlRatio": "0.000906447858888",
            "posId": "452587086133239818",
            "posSide": "long",
            "direction": "long",
            "triggerPx": "",
            "type": "1",
            "uTime": "1654177174419",
            "uly": "BTC-USD",
            "nonSettleAvgPx":"",
            "settledPnl":""
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instType	String	Instrument type
instId	String	Instrument ID
mgnMode	String	Margin mode
cross isolated
type	String	The type of latest close position
1：Close position partially;2：Close all;3：Liquidation;4：Partial liquidation; 5：ADL;
It is the latest type if there are several types for the same position.
cTime	String	Created time of position
uTime	String	Updated time of position
openAvgPx	String	Average price of opening position
Under cross-margin mode, the entry price of expiry futures will update at settlement to the last settlement price, and when the position is opened or increased.
nonSettleAvgPx	String	Non-settlement entry price
The non-settlement entry price only reflects the average price at which the position is opened or increased.
Only applicable to cross FUTURES
closeAvgPx	String	Average price of closing position
posId	String	Position ID
openMaxPos	String	Max quantity of position
closeTotalPos	String	Position's cumulative closed volume
realizedPnl	String	Realized profit and loss
Only applicable to FUTURES/SWAP/OPTION
realizedPnl=pnl+fee+fundingFee+liqPenalty+settledPnl
settledPnl	String	Accumulated settled profit and loss (calculated by settlement price)
Only applicable to cross FUTURES
pnlRatio	String	Realized P&L ratio
fee	String	Accumulated fee
Negative number represents the user transaction fee charged by the platform.Positive number represents rebate.
fundingFee	String	Accumulated funding fee
liqPenalty	String	Accumulated liquidation penalty. It is negative when there is a value.
pnl	String	Profit and loss (excluding the fee).
posSide	String	Position mode side
long: Hedge mode long
short: Hedge mode short
net: Net mode
lever	String	Leverage
direction	String	Direction: long short
Only applicable to MARGIN/FUTURES/SWAP/OPTION
triggerPx	String	trigger mark price. There is value when type is equal to 3, 4 or 5. It is "" when type is equal to 1 or 2
uly	String	Underlying
ccy	String	Currency used for margin
Trade
All Trade API endpoints require authentication.

POST / Place order
You can place an order only if you have sufficient funds.

Rate Limit: 60 requests per 2 seconds
Rate Limit of lead trader lead instruments for Copy Trading: 4 requests per 2 seconds
Rate limit rule (except Options): User ID + Instrument ID
Rate limit rule (Options only): User ID + Instrument Family
Permission: Trade
Rate limit of this endpoint will also be affected by the rules Sub-account rate limit and Fill ratio based sub-account rate limit.

HTTP Request
POST /api/v5/trade/order

Request Example

 place order for SPOT
 POST /api/v5/trade/order
 body
 {
    "instId":"BTC-USDT",
    "tdMode":"cash",
    "clOrdId":"b15",
    "side":"buy",
    "ordType":"limit",
    "px":"2.15",
    "sz":"2"
}
Request Parameters
Parameter	Type	Required	Description
instId	String	Yes	Instrument ID, e.g. BTC-USDT
tdMode	String	Yes	Trade mode
Margin mode cross isolated
Non-Margin mode cash
spot_isolated (only applicable to SPOT lead trading, tdMode should be spot_isolated for SPOT lead trading.)
Note: isolated is not available in multi-currency margin mode and portfolio margin mode.
ccy	String	No	Margin currency
Applicable to all isolated MARGIN orders and cross MARGIN orders in Futures mode.
clOrdId	String	No	Client Order ID as assigned by the client
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
Only applicable to general order. It will not be posted to algoId when placing TP/SL order after the general order is filled completely.
tag	String	No	Order tag
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 16 characters.
side	String	Yes	Order side, buy sell
posSide	String	Conditional	Position side
The default is net in the net mode
It is required in the long/short mode, and can only be long or short.
Only applicable to FUTURES/SWAP.
ordType	String	Yes	Order type
market: Market order, only applicable to SPOT/MARGIN/FUTURES/SWAP
limit: Limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order (applicable only to Expiry Futures and Perpetual Futures).
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
elp: Enhanced Liquidity Program order
sz	String	Yes	Quantity to buy or sell
px	String	Conditional	Order price. Only applicable to limit,post_only,fok,ioc,mmp,mmp_and_post_only order.
When placing an option order, one of px/pxUsd/pxVol must be filled in, and only one can be filled in
pxUsd	String	Conditional	Place options orders in USD
Only applicable to options
When placing an option order, one of px/pxUsd/pxVol must be filled in, and only one can be filled in
pxVol	String	Conditional	Place options orders based on implied volatility, where 1 represents 100%
Only applicable to options
When placing an option order, one of px/pxUsd/pxVol must be filled in, and only one can be filled in
reduceOnly	Boolean	No	Whether orders can only reduce in position size.
Valid options: true or false. The default value is false.
Only applicable to MARGIN orders, and FUTURES/SWAP orders in net mode
Only applicable to Futures mode and Multi-currency margin
tgtCcy	String	No	Whether the target currency uses the quote or base currency.
base_ccy: Base currency ,quote_ccy: Quote currency
Only applicable to SPOT Market Orders
Default is quote_ccy for buy, base_ccy for sell
banAmend	Boolean	No	Whether to disallow the system from amending the size of the SPOT Market Order.
Valid options: true or false. The default value is false.
If true, system will not amend and reject the market order if user does not have sufficient funds.
Only applicable to SPOT Market Orders
pxAmendType	String	No	The price amendment type for orders
0: Do not allow the system to amend to order price if px exceeds the price limit
1: Allow the system to amend the price to the best available value within the price limit if px exceeds the price limit
The default value is 0
tradeQuoteCcy	String	No	The quote currency used for trading. Only applicable to SPOT.
The default value is the quote currency of the instId, for example: for BTC-USD, the default is USD.
stpMode	String	No	Self trade prevention mode.
cancel_maker,cancel_taker, cancel_both
Cancel both does not support FOK

The account-level acctStpMode will be used to place orders by default. The default value of this field is cancel_maker. Users can log in to the webpage through the master account to modify this configuration. Users can also utilize the stpMode request parameter of the placing order endpoint to determine the stpMode of a certain order.
isElpTakerAccess	Boolean	No	ELP taker access
true: the request can trade with ELP orders but a speed bump will be applied
false: the request cannot trade with ELP orders and no speed bump

The default value is false while true is only applicable to ioc orders.
attachAlgoOrds	Array of objects	No	TP/SL information attached when placing order
> attachAlgoClOrdId	String	No	Client-supplied Algo ID when placing order attaching TP/SL
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
It will be posted to algoClOrdId when placing TP/SL order once the general order is filled completely.
> tpTriggerPx	String	Conditional	Take-profit trigger price
For condition TP order, if you fill in this parameter, you should fill in the take-profit order price as well.
> tpTriggerRatio	String	Conditional	Take profit trigger ratio, 0.3 represents 30%
Only one of tpTriggerPx and tpTriggerRatio can be passed
Only applicable to FUTURES and SWAP.
If the main order is a buy order, it must be greater than 0, and if the main order is a sell order, it must be bewteen -1 and 0.
> tpOrdPx	String	Conditional	Take-profit order price

For condition TP order, if you fill in this parameter, you should fill in the take-profit trigger price as well.
For limit TP order, you need to fill in this parameter, but the take-profit trigger price doesn’t need to be filled.
If the price is -1, take-profit will be executed at the market price.
> tpOrdKind	String	No	TP order kind
condition
limit
The default is condition
> slTriggerPx	String	Conditional	Stop-loss trigger price
If you fill in this parameter, you should fill in the stop-loss order price.
> slTriggerRatio	String	Conditional	Stop profit trigger ratio, 0.3 represents 30%
Only one of slTriggerPx and slTriggerRatio can be passed
Only applicable to FUTURES and SWAP.
If the main order is a buy order, it should be bewteen 0 and 1, and if the main order is a sell order, it must be greater than 0.
> slOrdPx	String	Conditional	Stop-loss order price
If you fill in this parameter, you should fill in the stop-loss trigger price.
If the price is -1, stop-loss will be executed at the market price.
> tpTriggerPxType	String	No	Take-profit trigger price type
last: last price
index: index price
mark: mark price
The default is last
> slTriggerPxType	String	No	Stop-loss trigger price type
last: last price
index: index price
mark: mark price
The default is last
> sz	String	Conditional	Size. Only applicable to TP order of split TPs, and it is required for TP order of split TPs
> amendPxOnTriggerType	String	No	Whether to enable Cost-price SL. Only applicable to SL order of split TPs. Whether slTriggerPx will move to avgPx when the first TP order is triggered
0: disable, the default value
1: Enable
Response Example

{
  "code": "0",
  "msg": "",
  "data": [
    {
      "clOrdId": "oktswap6",
      "ordId": "312269865356374016",
      "tag": "",
      "ts":"1695190491421",
      "sCode": "0",
      "sMsg": "",
      "subCode": ""
    }
  ],
  "inTime": "1695190491421339",
  "outTime": "1695190491423240"
}
Response Parameters
Parameter	Type	Description
code	String	The result code, 0 means success
msg	String	The error message, empty if the code is 0
data	Array of objects	Array of objects contains the response results
> ordId	String	Order ID
> clOrdId	String	Client Order ID as assigned by the client
> tag	String	Order tag
> ts	String	Timestamp when the order request processing is finished by our system, Unix timestamp format in milliseconds, e.g. 1597026383085
> sCode	String	The code of the event execution result, 0 means success.
> sMsg	String	Rejection or success message of event execution.
> subCode	String	Sub-code of sCode.
Returns "" when sCode is 0 (request successful).
When sCode is not 0 (request failed), returns the sub-code if available; otherwise returns "".
inTime	String	Timestamp at REST gateway when the request is received, Unix timestamp format in microseconds, e.g. 1597026383085123
The time is recorded after authentication.
outTime	String	Timestamp at REST gateway when the response is sent, Unix timestamp format in microseconds, e.g. 1597026383085123
POST / Close positions
Close the position of an instrument via a market order.

Rate Limit: 20 requests per 2 seconds
Rate limit rule (except Options): User ID + Instrument ID
Rate limit rule (Options only): User ID + Instrument Family
Permission: Trade
HTTP Request
POST /api/v5/trade/close-position

Request Example

POST /api/v5/trade/close-position
body
{
    "instId":"BTC-USDT-SWAP",
    "mgnMode":"cross"
}
Request Parameters
Parameter	Type	Required	Description
instId	String	Yes	Instrument ID
posSide	String	Conditional	Position side
This parameter can be omitted in net mode, and the default value is net. You can only fill with net.
This parameter must be filled in under the long/short mode. Fill in long for close-long and short for close-short.
mgnMode	String	Yes	Margin mode
cross isolated
ccy	String	Conditional	Margin currency, required in the case of closing cross MARGIN position for Futures mode.
autoCxl	Boolean	No	Whether any pending orders for closing out needs to be automatically canceled when close position via a market order.
false or true, the default is false.
clOrdId	String	No	Client-supplied ID
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
tag	String	No	Order tag
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 16 characters.
Response Example

{
    "code": "0",
    "data": [
        {
            "clOrdId": "",
            "instId": "BTC-USDT-SWAP",
            "posSide": "long",
            "tag": ""
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instId	String	Instrument ID
posSide	String	Position side
clOrdId	String	Client-supplied ID
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
tag	String	Order tag
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 16 characters.
 if there are any pending orders for closing out and the orders do not need to be automatically canceled, it will return an error code and message to prompt users to cancel pending orders before closing the positions.
GET / Order details
Retrieve order details.

Rate Limit: 60 requests per 2 seconds
Rate limit rule (except Options): User ID + Instrument ID
Rate limit rule (Options only): User ID + Instrument Family
Permission: Read
HTTP Request
GET /api/v5/trade/order

Request Example

GET /api/v5/trade/order?ordId=1753197687182819328&instId=BTC-USDT

Request Parameters
Parameter	Type	Required	Description
instId	String	Yes	Instrument ID, e.g. BTC-USDT
Only applicable to live instruments
ordId	String	Conditional	Order ID
Either ordId or clOrdId is required, if both are passed, ordId will be used
clOrdId	String	Conditional	Client Order ID as assigned by the client
If the clOrdId is associated with multiple orders, only the latest one will be returned.
Response Example

{
    "code": "0",
    "data": [
        {
            "accFillSz": "0.00192834",
            "algoClOrdId": "",
            "algoId": "",
            "attachAlgoClOrdId": "",
            "attachAlgoOrds": [],
            "avgPx": "51858",
            "cTime": "1708587373361",
            "cancelSource": "",
            "cancelSourceReason": "",
            "category": "normal",
            "ccy": "",
            "clOrdId": "",
            "fee": "-0.00000192834",
            "feeCcy": "BTC",
            "fillPx": "51858",
            "fillSz": "0.00192834",
            "fillTime": "1708587373361",
            "instId": "BTC-USDT",
            "instType": "SPOT",
            "isTpLimit": "false",
            "lever": "",
            "linkedAlgoOrd": {
                "algoId": ""
            },
            "ordId": "680800019749904384",
            "ordType": "market",
            "pnl": "0",
            "posSide": "net",
            "px": "",
            "pxType": "",
            "pxUsd": "",
            "pxVol": "",
            "quickMgnType": "",
            "rebate": "0",
            "rebateCcy": "USDT",
            "reduceOnly": "false",
            "side": "buy",
            "slOrdPx": "",
            "slTriggerPx": "",
            "slTriggerPxType": "",
            "source": "",
            "state": "filled",
            "stpId": "",
            "stpMode": "",
            "sz": "100",
            "tag": "",
            "tdMode": "cash",
            "tgtCcy": "quote_ccy",
            "tpOrdPx": "",
            "tpTriggerPx": "",
            "tpTriggerPxType": "",
            "tradeId": "744876980",
            "tradeQuoteCcy": "USDT",
            "uTime": "1708587373362"
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instType	String	Instrument type
SPOT
MARGIN
SWAP
FUTURES
OPTION
instId	String	Instrument ID
tgtCcy	String	Order quantity unit setting for sz
base_ccy: Base currency ,quote_ccy: Quote currency
Only applicable to SPOT Market Orders
Default is quote_ccy for buy, base_ccy for sell
ccy	String	Margin currency
Applicable to all isolated MARGIN orders and cross MARGIN orders in Futures mode, FUTURES and SWAP contracts.
ordId	String	Order ID
clOrdId	String	Client Order ID as assigned by the client
tag	String	Order tag
px	String	Price
For options, use coin as unit (e.g. BTC, ETH)
pxUsd	String	Options price in USDOnly applicable to options; return "" for other instrument types
pxVol	String	Implied volatility of the options orderOnly applicable to options; return "" for other instrument types
pxType	String	Price type of options
px: Place an order based on price, in the unit of coin (the unit for the request parameter px is BTC or ETH)
pxVol: Place an order based on pxVol
pxUsd: Place an order based on pxUsd, in the unit of USD (the unit for the request parameter px is USD)
sz	String	Quantity to buy or sell
pnl	String	Profit and loss (excluding the fee).
Applicable to orders which have a trade and aim to close position. It always is 0 in other conditions
ordType	String	Order type
market: Market order
limit: Limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
side	String	Order side
posSide	String	Position side
tdMode	String	Trade mode
accFillSz	String	Accumulated fill quantity
The unit is base_ccy for SPOT and MARGIN, e.g. BTC-USDT, the unit is BTC; For market orders, the unit both is base_ccy when the tgtCcy is base_ccy or quote_ccy;
The unit is contract for FUTURES/SWAP/OPTION
fillPx	String	Last filled price. If none is filled, it will return "".
tradeId	String	Last traded ID
fillSz	String	Last filled quantity
The unit is base_ccy for SPOT and MARGIN, e.g. BTC-USDT, the unit is BTC; For market orders, the unit both is base_ccy when the tgtCcy is base_ccy or quote_ccy;
The unit is contract for FUTURES/SWAP/OPTION
fillTime	String	Last filled time
avgPx	String	Average filled price. If none is filled, it will return "".
state	String	State
canceled
live
partially_filled
filled
mmp_canceled
stpId	String	Self trade prevention ID
Return "" if self trade prevention is not applicable (deprecated)
stpMode	String	Self trade prevention mode
lever	String	Leverage, from 0.01 to 125.
Only applicable to MARGIN/FUTURES/SWAP
attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL.
tpTriggerPx	String	Take-profit trigger price.
tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
tpOrdPx	String	Take-profit order price.
slTriggerPx	String	Stop-loss trigger price.
slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
slOrdPx	String	Stop-loss order price.
attachAlgoOrds	Array of objects	TP/SL information attached when placing order
> attachAlgoId	String	The order ID of attached TP/SL order. It can be used to identity the TP/SL order when amending. It will not be posted to algoId when placing TP/SL order after the general order is filled completely.
> attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
It will be posted to algoClOrdId when placing TP/SL order once the general order is filled completely.
> tpOrdKind	String	TP order kind
condition
limit
> tpTriggerPx	String	Take-profit trigger price.
> tpTriggerRatio	String	Take profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
> tpOrdPx	String	Take-profit order price.
> slTriggerPx	String	Stop-loss trigger price.
> slTriggerRatio	String	Stop profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
> slOrdPx	String	Stop-loss order price.
> sz	String	Size. Only applicable to TP order of split TPs
> amendPxOnTriggerType	String	Whether to enable Cost-price SL. Only applicable to SL order of split TPs.
0: disable, the default value
1: Enable
> amendPxOnTriggerType	String	Whether to enable Cost-price SL. Only applicable to SL order of split TPs.
0: disable, the default value
1: Enable
> failCode	String	The error code when failing to place TP/SL order, e.g. 51020
The default is ""
> failReason	String	The error reason when failing to place TP/SL order.
The default is ""
linkedAlgoOrd	Object	Linked SL order detail, only applicable to the order that is placed by one-cancels-the-other (OCO) order that contains the TP limit order.
> algoId	String	Algo ID
feeCcy	String	Fee currency
For maker sell orders of Spot and Margin, this represents the quote currency. For all other cases, it represents the currency in which fees are charged.
fee	String	Fee amount
For Spot and Margin (excluding maker sell orders): accumulated fee charged by the platform, always negative
For maker sell orders in Spot and Margin, Expiry Futures, Perpetual Futures and Options: accumulated fee and rebate (always in quote currency for maker sell orders in Spot and Margin)
rebateCcy	String	Rebate currency
For maker sell orders of Spot and Margin, this represents the base currency. For all other cases, it represents the currency in which rebates are paid.
rebate	String	Rebate amount, only applicable to Spot and Margin
For maker sell orders: Accumulated fee and rebate amount in the unit of base currency.
For all other cases, it represents the maker rebate amount, always positive, return "" if no rebate.
source	String	Order source
6: The normal order triggered by the trigger order
7:The normal order triggered by the TP/SL order
13: The normal order triggered by the algo order
25:The normal order triggered by the trailing stop order
34: The normal order triggered by the chase order
category	String	Category
normal
twap
adl
full_liquidation
partial_liquidation
delivery
ddh: Delta dynamic hedge
auto_conversion
reduceOnly	String	Whether the order can only reduce the position size. Valid options: true or false.
isTpLimit	String	Whether it is TP limit order. true or false
cancelSource	String	Code of the cancellation source.
cancelSourceReason	String	Reason for the cancellation.
quickMgnType	String	Quick Margin type, Only applicable to Quick Margin Mode of isolated margin
manual, auto_borrow, auto_repay
algoClOrdId	String	Client-supplied Algo ID. There will be a value when algo order attaching algoClOrdId is triggered, or it will be "".
algoId	String	Algo ID. There will be a value when algo order is triggered, or it will be "".
uTime	String	Update time, Unix timestamp format in milliseconds, e.g. 1597026383085
cTime	String	Creation time, Unix timestamp format in milliseconds, e.g. 1597026383085
tradeQuoteCcy	String	The quote currency used for trading.
GET / Order List
Retrieve all incomplete orders under the current account.

Rate Limit: 60 requests per 2 seconds
Rate limit rule: User ID
Permission: Read
HTTP Request
GET /api/v5/trade/orders-pending

Request Example

GET /api/v5/trade/orders-pending?ordType=post_only,fok,ioc&instType=SPOT

Request Parameters
Parameter	Type	Required	Description
instType	String	No	Instrument type
SPOT
MARGIN
SWAP
FUTURES
OPTION
instFamily	String	No	Instrument family
Applicable to FUTURES/SWAP/OPTION
instId	String	No	Instrument ID, e.g. BTC-USD-200927
ordType	String	No	Order type
market: Market order
limit: Limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
state	String	No	State
live
partially_filled
after	String	No	Pagination of data to return records earlier than the requested ordId
before	String	No	Pagination of data to return records newer than the requested ordId
limit	String	No	Number of results per request. The maximum is 100; The default is 100
Response Example

{
    "code": "0",
    "data": [
        {
            "accFillSz": "0",
            "algoClOrdId": "",
            "algoId": "",
            "attachAlgoClOrdId": "",
            "attachAlgoOrds": [],
            "avgPx": "",
            "cTime": "1724733617998",
            "cancelSource": "",
            "cancelSourceReason": "",
            "category": "normal",
            "ccy": "",
            "clOrdId": "",
            "fee": "0",
            "feeCcy": "BTC",
            "fillPx": "",
            "fillSz": "0",
            "fillTime": "",
            "instId": "BTC-USDT",
            "instType": "SPOT",
            "isTpLimit": "false",
            "lever": "",
            "linkedAlgoOrd": {
                "algoId": ""
            },
            "ordId": "1752588852617379840",
            "ordType": "post_only",
            "pnl": "0",
            "posSide": "net",
            "px": "13013.5",
            "pxType": "",
            "pxUsd": "",
            "pxVol": "",
            "quickMgnType": "",
            "rebate": "0",
            "rebateCcy": "USDT",
            "reduceOnly": "false",
            "side": "buy",
            "slOrdPx": "",
            "slTriggerPx": "",
            "slTriggerPxType": "",
            "source": "",
            "state": "live",
            "stpId": "",
            "stpMode": "cancel_maker",
            "sz": "0.001",
            "tag": "",
            "tdMode": "cash",
            "tgtCcy": "",
            "tpOrdPx": "",
            "tpTriggerPx": "",
            "tpTriggerPxType": "",
            "tradeId": "",
            "tradeQuoteCcy": "USDT",
            "uTime": "1724733617998"
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instType	String	Instrument type
instId	String	Instrument ID
tgtCcy	String	Order quantity unit setting for sz
base_ccy: Base currency ,quote_ccy: Quote currency
Only applicable to SPOT Market Orders
Default is quote_ccy for buy, base_ccy for sell
ccy	String	Margin currency
Applicable to all isolated MARGIN orders and cross MARGIN orders in Futures mode, FUTURES and SWAP contracts.
ordId	String	Order ID
clOrdId	String	Client Order ID as assigned by the client
tag	String	Order tag
px	String	Price
For options, use coin as unit (e.g. BTC, ETH)
pxUsd	String	Options price in USDOnly applicable to options; return "" for other instrument types
pxVol	String	Implied volatility of the options orderOnly applicable to options; return "" for other instrument types
pxType	String	Price type of options
px: Place an order based on price, in the unit of coin (the unit for the request parameter px is BTC or ETH)
pxVol: Place an order based on pxVol
pxUsd: Place an order based on pxUsd, in the unit of USD (the unit for the request parameter px is USD)
sz	String	Quantity to buy or sell
pnl	String	Profit and loss (excluding the fee).
Applicable to orders which have a trade and aim to close position. It always is 0 in other conditions
ordType	String	Order type
market: Market order
limit: Limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
side	String	Order side
posSide	String	Position side
tdMode	String	Trade mode
accFillSz	String	Accumulated fill quantity
fillPx	String	Last filled price
tradeId	String	Last trade ID
fillSz	String	Last filled quantity
fillTime	String	Last filled time
avgPx	String	Average filled price. If none is filled, it will return "".
state	String	State
live
partially_filled
lever	String	Leverage, from 0.01 to 125.
Only applicable to MARGIN/FUTURES/SWAP
attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL.
tpTriggerPx	String	Take-profit trigger price.
tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
tpOrdPx	String	Take-profit order price.
slTriggerPx	String	Stop-loss trigger price.
slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
slOrdPx	String	Stop-loss order price.
attachAlgoOrds	Array of objects	TP/SL information attached when placing order
> attachAlgoId	String	The order ID of attached TP/SL order. It can be used to identity the TP/SL order when amending. It will not be posted to algoId when placing TP/SL order after the general order is filled completely.
> attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
It will be posted to algoClOrdId when placing TP/SL order once the general order is filled completely.
> tpOrdKind	String	TP order kind
condition
limit
> tpTriggerPx	String	Take-profit trigger price.
> tpTriggerRatio	String	Take profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
> tpOrdPx	String	Take-profit order price.
> slTriggerPx	String	Stop-loss trigger price.
> slTriggerRatio	String	Stop profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
> slOrdPx	String	Stop-loss order price.
> sz	String	Size. Only applicable to TP order of split TPs
> amendPxOnTriggerType	String	Whether to enable Cost-price SL. Only applicable to SL order of split TPs.
0: disable, the default value
1: Enable
> failCode	String	The error code when failing to place TP/SL order, e.g. 51020
The default is ""
> failReason	String	The error reason when failing to place TP/SL order.
The default is ""
linkedAlgoOrd	Object	Linked SL order detail, only applicable to the order that is placed by one-cancels-the-other (OCO) order that contains the TP limit order.
> algoId	String	Algo ID
stpId	String	Self trade prevention ID
Return "" if self trade prevention is not applicable (deprecated)
stpMode	String	Self trade prevention mode
feeCcy	String	Fee currency
For maker sell orders of Spot and Margin, this represents the quote currency. For all other cases, it represents the currency in which fees are charged.
fee	String	Fee amount
For Spot and Margin (excluding maker sell orders): accumulated fee charged by the platform, always negative
For maker sell orders in Spot and Margin, Expiry Futures, Perpetual Futures and Options: accumulated fee and rebate (always in quote currency for maker sell orders in Spot and Margin)
rebateCcy	String	Rebate currency
For maker sell orders of Spot and Margin, this represents the base currency. For all other cases, it represents the currency in which rebates are paid.
rebate	String	Rebate amount, only applicable to Spot and Margin
For maker sell orders: Accumulated fee and rebate amount in the unit of base currency.
For all other cases, it represents the maker rebate amount, always positive, return "" if no rebate.
source	String	Order source
6: The normal order triggered by the trigger order
7:The normal order triggered by the TP/SL order
13: The normal order triggered by the algo order
25:The normal order triggered by the trailing stop order
34: The normal order triggered by the chase order
category	String	Category
normal
reduceOnly	String	Whether the order can only reduce the position size. Valid options: true or false.
quickMgnType	String	Quick Margin type, Only applicable to Quick Margin Mode of isolated margin
manual, auto_borrow, auto_repay
algoClOrdId	String	Client-supplied Algo ID. There will be a value when algo order attaching algoClOrdId is triggered, or it will be "".
algoId	String	Algo ID. There will be a value when algo order is triggered, or it will be "".
isTpLimit	String	Whether it is TP limit order. true or false
uTime	String	Update time, Unix timestamp format in milliseconds, e.g. 1597026383085
cTime	String	Creation time, Unix timestamp format in milliseconds, e.g. 1597026383085
cancelSource	String	Code of the cancellation source.
cancelSourceReason	String	Reason for the cancellation.
tradeQuoteCcy	String	The quote currency used for trading.
GET / Order history (last 7 days)
Get completed orders which are placed in the last 7 days, including those placed 7 days ago but completed in the last 7 days.

The incomplete orders that have been canceled are only reserved for 2 hours.

Rate Limit: 40 requests per 2 seconds
Rate limit rule: User ID
Permission: Read
HTTP Request
GET /api/v5/trade/orders-history

Request Example

GET /api/v5/trade/orders-history?ordType=post_only,fok,ioc&instType=SPOT

Request Parameters
Parameter	Type	Required	Description
instType	String	yes	Instrument type
SPOT
MARGIN
SWAP
FUTURES
OPTION
instFamily	String	No	Instrument family
Applicable to FUTURES/SWAP/OPTION
instId	String	No	Instrument ID, e.g. BTC-USDT
ordType	String	No	Order type
market: market order
limit: limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
state	String	No	State
canceled
filled
mmp_canceled: Order canceled automatically due to Market Maker Protection
category	String	No	Category
twap
adl
full_liquidation
partial_liquidation
delivery
ddh: Delta dynamic hedge
after	String	No	Pagination of data to return records earlier than the requested ordId
before	String	No	Pagination of data to return records newer than the requested ordId
begin	String	No	Filter with a begin timestamp cTime. Unix timestamp format in milliseconds, e.g. 1597026383085
end	String	No	Filter with an end timestamp cTime. Unix timestamp format in milliseconds, e.g. 1597026383085
limit	String	No	Number of results per request. The maximum is 100; The default is 100
Response Example

{
    "code": "0",
    "data": [
        {
            "accFillSz": "0.00192834",
            "algoClOrdId": "",
            "algoId": "",
            "attachAlgoClOrdId": "",
            "attachAlgoOrds": [],
            "avgPx": "51858",
            "cTime": "1708587373361",
            "cancelSource": "",
            "cancelSourceReason": "",
            "category": "normal",
            "ccy": "",
            "clOrdId": "",
            "fee": "-0.00000192834",
            "feeCcy": "BTC",
            "fillPx": "51858",
            "fillSz": "0.00192834",
            "fillTime": "1708587373361",
            "instId": "BTC-USDT",
            "instType": "SPOT",
            "lever": "",
            "linkedAlgoOrd": {
                "algoId": ""
            },
            "ordId": "680800019749904384",
            "ordType": "market",
            "pnl": "0",
            "posSide": "",
            "px": "",
            "pxType": "",
            "pxUsd": "",
            "pxVol": "",
            "quickMgnType": "",
            "rebate": "0",
            "rebateCcy": "USDT",
            "reduceOnly": "false",
            "side": "buy",
            "slOrdPx": "",
            "slTriggerPx": "",
            "slTriggerPxType": "",
            "source": "",
            "state": "filled",
            "stpId": "",
            "stpMode": "",
            "sz": "100",
            "tag": "",
            "tdMode": "cash",
            "tgtCcy": "quote_ccy",
            "tpOrdPx": "",
            "tpTriggerPx": "",
            "tpTriggerPxType": "",
            "tradeId": "744876980",
            "tradeQuoteCcy": "USDT",
            "uTime": "1708587373362",
            "isTpLimit": "false"
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instType	String	Instrument type
instId	String	Instrument ID
tgtCcy	String	Order quantity unit setting for sz
base_ccy: Base currency ,quote_ccy: Quote currency
Only applicable to SPOT Market Orders
Default is quote_ccy for buy, base_ccy for sell
ccy	String	Margin currency
Applicable to all isolated MARGIN orders and cross MARGIN orders in Futures mode, FUTURES and SWAP contracts.
ordId	String	Order ID
clOrdId	String	Client Order ID as assigned by the client
tag	String	Order tag
px	String	Price
For options, use coin as unit (e.g. BTC, ETH)
pxUsd	String	Options price in USDOnly applicable to options; return "" for other instrument types
pxVol	String	Implied volatility of the options orderOnly applicable to options; return "" for other instrument types
pxType	String	Price type of options
px: Place an order based on price, in the unit of coin (the unit for the request parameter px is BTC or ETH)
pxVol: Place an order based on pxVol
pxUsd: Place an order based on pxUsd, in the unit of USD (the unit for the request parameter px is USD)
sz	String	Quantity to buy or sell
ordType	String	Order type
market: market order
limit: limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
side	String	Order side
posSide	String	Position side
tdMode	String	Trade mode
accFillSz	String	Accumulated fill quantity
fillPx	String	Last filled price. If none is filled, it will return "".
tradeId	String	Last trade ID
fillSz	String	Last filled quantity
fillTime	String	Last filled time
avgPx	String	Average filled price. If none is filled, it will return "".
state	String	State
canceled
filled
mmp_canceled
lever	String	Leverage, from 0.01 to 125.
Only applicable to MARGIN/FUTURES/SWAP
attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL.
tpTriggerPx	String	Take-profit trigger price.
tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
tpOrdPx	String	Take-profit order price.
slTriggerPx	String	Stop-loss trigger price.
slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
slOrdPx	String	Stop-loss order price.
attachAlgoOrds	Array of objects	TP/SL information attached when placing order
> attachAlgoId	String	The order ID of attached TP/SL order. It can be used to identity the TP/SL order when amending. It will not be posted to algoId when placing TP/SL order after the general order is filled completely.
> attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
It will be posted to algoClOrdId when placing TP/SL order once the general order is filled completely.
> tpOrdKind	String	TP order kind
condition
limit
> tpTriggerPx	String	Take-profit trigger price.
> tpTriggerRatio	String	Take profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
> tpOrdPx	String	Take-profit order price.
> slTriggerPx	String	Stop-loss trigger price.
> slTriggerRatio	String	Stop profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
> slOrdPx	String	Stop-loss order price.
> sz	String	Size. Only applicable to TP order of split TPs
> amendPxOnTriggerType	String	Whether to enable Cost-price SL. Only applicable to SL order of split TPs.
0: disable, the default value
1: Enable
> failCode	String	The error code when failing to place TP/SL order, e.g. 51020
The default is ""
> failReason	String	The error reason when failing to place TP/SL order.
The default is ""
linkedAlgoOrd	Object	Linked SL order detail, only applicable to the order that is placed by one-cancels-the-other (OCO) order that contains the TP limit order.
> algoId	String	Algo ID
stpId	String	Self trade prevention ID
Return "" if self trade prevention is not applicable (deprecated)
stpMode	String	Self trade prevention mode
feeCcy	String	Fee currency
For maker sell orders of Spot and Margin, this represents the quote currency. For all other cases, it represents the currency in which fees are charged.
fee	String	Fee amount
For Spot and Margin (excluding maker sell orders): accumulated fee charged by the platform, always negative
For maker sell orders in Spot and Margin, Expiry Futures, Perpetual Futures and Options: accumulated fee and rebate (always in quote currency for maker sell orders in Spot and Margin)
rebateCcy	String	Rebate currency
For maker sell orders of Spot and Margin, this represents the base currency. For all other cases, it represents the currency in which rebates are paid.
rebate	String	Rebate amount, only applicable to Spot and Margin
For maker sell orders: Accumulated fee and rebate amount in the unit of base currency.
For all other cases, it represents the maker rebate amount, always positive, return "" if no rebate.
source	String	Order source
6: The normal order triggered by the trigger order
7:The normal order triggered by the TP/SL order
13: The normal order triggered by the algo order
25:The normal order triggered by the trailing stop order
34: The normal order triggered by the chase order
pnl	String	Profit and loss (excluding the fee).
Applicable to orders which have a trade and aim to close position. It always is 0 in other conditions
category	String	Category
normal
twap
adl
full_liquidation
partial_liquidation
delivery
ddh: Delta dynamic hedge
auto_conversion
reduceOnly	String	Whether the order can only reduce the position size. Valid options: true or false.
cancelSource	String	Code of the cancellation source.
cancelSourceReason	String	Reason for the cancellation.
algoClOrdId	String	Client-supplied Algo ID. There will be a value when algo order attaching algoClOrdId is triggered, or it will be "".
algoId	String	Algo ID. There will be a value when algo order is triggered, or it will be "".
isTpLimit	String	Whether it is TP limit order. true or false
uTime	String	Update time, Unix timestamp format in milliseconds, e.g. 1597026383085
cTime	String	Creation time, Unix timestamp format in milliseconds, e.g. 1597026383085
quickMgnType	String	Quick Margin type, Only applicable to Quick Margin Mode of isolated margin
manual, auto_borrow, auto_repay (Deprecated)
tradeQuoteCcy	String	The quote currency used for trading.
GET / Order history (last 3 months)
Get completed orders which are placed in the last 3 months, including those placed 3 months ago but completed in the last 3 months.

Rate Limit: 20 requests per 2 seconds
Rate limit rule: User ID
Permission: Read
HTTP Request
GET /api/v5/trade/orders-history-archive

Request Example

GET /api/v5/trade/orders-history-archive?ordType=post_only,fok,ioc&instType=SPOT

Request Parameters
Parameter	Type	Required	Description
instType	String	yes	Instrument type
SPOT
MARGIN
SWAP
FUTURES
OPTION
instFamily	String	No	Instrument family
Applicable to FUTURES/SWAP/OPTION
instId	String	No	Instrument ID, e.g. BTC-USD-200927
ordType	String	No	Order type
market: Market order
limit: Limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
state	String	No	State
canceled
filled
mmp_canceled: Order canceled automatically due to Market Maker Protection
category	String	No	Category
twap
adl
full_liquidation
partial_liquidation
delivery
ddh: Delta dynamic hedge
after	String	No	Pagination of data to return records earlier than the requested ordId
before	String	No	Pagination of data to return records newer than the requested ordId
begin	String	No	Filter with a begin timestamp cTime. Unix timestamp format in milliseconds, e.g. 1597026383085
end	String	No	Filter with an end timestamp cTime. Unix timestamp format in milliseconds, e.g. 1597026383085
limit	String	No	Number of results per request. The maximum is 100; The default is 100
Response Example

{
    "code": "0",
    "data": [
        {
            "accFillSz": "0.00192834",
            "algoClOrdId": "",
            "algoId": "",
            "attachAlgoClOrdId": "",
            "attachAlgoOrds": [],
            "avgPx": "51858",
            "cTime": "1708587373361",
            "cancelSource": "",
            "cancelSourceReason": "",
            "category": "normal",
            "ccy": "",
            "clOrdId": "",
            "fee": "-0.00000192834",
            "feeCcy": "BTC",
            "fillPx": "51858",
            "fillSz": "0.00192834",
            "fillTime": "1708587373361",
            "instId": "BTC-USDT",
            "instType": "SPOT",
            "lever": "",
            "ordId": "680800019749904384",
            "ordType": "market",
            "pnl": "0",
            "posSide": "",
            "px": "",
            "pxType": "",
            "pxUsd": "",
            "pxVol": "",
            "quickMgnType": "",
            "rebate": "0",
            "rebateCcy": "USDT",
            "reduceOnly": "false",
            "side": "buy",
            "slOrdPx": "",
            "slTriggerPx": "",
            "slTriggerPxType": "",
            "source": "",
            "state": "filled",
            "stpId": "",
            "stpMode": "",
            "sz": "100",
            "tag": "",
            "tdMode": "cash",
            "tgtCcy": "quote_ccy",
            "tpOrdPx": "",
            "tpTriggerPx": "",
            "tpTriggerPxType": "",
            "tradeId": "744876980",
            "tradeQuoteCcy": "USDT",
            "uTime": "1708587373362",
            "isTpLimit": "false",
            "linkedAlgoOrd": {
                "algoId": ""
            }
        }
    ],
    "msg": ""
}
Response Parameters
Parameter	Type	Description
instType	String	Instrument type
instId	String	Instrument ID
tgtCcy	String	Order quantity unit setting for sz
base_ccy: Base currency ,quote_ccy: Quote currency
Only applicable to SPOT Market Orders
Default is quote_ccy for buy, base_ccy for sell
ccy	String	Margin currency
Applicable to all isolated MARGIN orders and cross MARGIN orders in Futures mode, FUTURES and SWAP contracts.
ordId	String	Order ID
clOrdId	String	Client Order ID as assigned by the client
tag	String	Order tag
px	String	Price
For options, use coin as unit (e.g. BTC, ETH)
pxUsd	String	Options price in USDOnly applicable to options; return "" for other instrument types
pxVol	String	Implied volatility of the options orderOnly applicable to options; return "" for other instrument types
pxType	String	Price type of options
px: Place an order based on price, in the unit of coin (the unit for the request parameter px is BTC or ETH)
pxVol: Place an order based on pxVol
pxUsd: Place an order based on pxUsd, in the unit of USD (the unit for the request parameter px is USD)
sz	String	Quantity to buy or sell
ordType	String	Order type
market: Market order
limit: Limit order
post_only: Post-only order
fok: Fill-or-kill order
ioc: Immediate-or-cancel order
optimal_limit_ioc: Market order with immediate-or-cancel order
mmp: Market Maker Protection (only applicable to Option in Portfolio Margin mode)
mmp_and_post_only: Market Maker Protection and Post-only order(only applicable to Option in Portfolio Margin mode)
op_fok: Simple options (fok)
elp: Enhanced Liquidity Program order
side	String	Order side
posSide	String	Position side
tdMode	String	Trade mode
accFillSz	String	Accumulated fill quantity
fillPx	String	Last filled price. If none is filled, it will return "".
tradeId	String	Last trade ID
fillSz	String	Last filled quantity
fillTime	String	Last filled time
avgPx	String	Average filled price. If none is filled, it will return "".
state	String	State
canceled
filled
mmp_canceled
lever	String	Leverage, from 0.01 to 125.
Only applicable to MARGIN/FUTURES/SWAP
attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL.
tpTriggerPx	String	Take-profit trigger price.
tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
tpOrdPx	String	Take-profit order price.
slTriggerPx	String	Stop-loss trigger price.
slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
slOrdPx	String	Stop-loss order price.
attachAlgoOrds	Array of objects	TP/SL information attached when placing order
> attachAlgoId	String	The order ID of attached TP/SL order. It can be used to identity the TP/SL order when amending. It will not be posted to algoId when placing TP/SL order after the general order is filled completely.
> attachAlgoClOrdId	String	Client-supplied Algo ID when placing order attaching TP/SL
A combination of case-sensitive alphanumerics, all numbers, or all letters of up to 32 characters.
It will be posted to algoClOrdId when placing TP/SL order once the general order is filled completely.
> tpOrdKind	String	TP order kind
condition
limit
> tpTriggerPx	String	Take-profit trigger price.
> tpTriggerRatio	String	Take profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> tpTriggerPxType	String	Take-profit trigger price type.
last: last price
index: index price
mark: mark price
> tpOrdPx	String	Take-profit order price.
> slTriggerPx	String	Stop-loss trigger price.
> slTriggerRatio	String	Stop profit trigger ratio, 0.3 represents 30%
Only applicable to FUTURES and SWAP.
> slTriggerPxType	String	Stop-loss trigger price type.
last: last price
index: index price
mark: mark price
> slOrdPx	String	Stop-loss order price.
> sz	String	Size. Only applicable to TP order of split TPs
> amendPxOnTriggerType	String	Whether to enable Cost-price SL. Only applicable to SL order of split TPs.
0: disable, the default value
1: Enable
> failCode	String	The error code when failing to place TP/SL order, e.g. 51020
The default is ""
> failReason	String	The error reason when failing to place TP/SL order.
The default is ""
linkedAlgoOrd	Object	Linked SL order detail, only applicable to the order that is placed by one-cancels-the-other (OCO) order that contains the TP limit order.
> algoId	String	Algo ID
stpId	String	Self trade prevention ID
Return "" if self trade prevention is not applicable (deprecated)
stpMode	String	Self trade prevention mode
feeCcy	String	Fee currency
For maker sell orders of Spot and Margin, this represents the quote currency. For all other cases, it represents the currency in which fees are charged.
fee	String	Fee amount
For Spot and Margin (excluding maker sell orders): accumulated fee charged by the platform, always negative
For maker sell orders in Spot and Margin, Expiry Futures, Perpetual Futures and Options: accumulated fee and rebate (always in quote currency for maker sell orders in Spot and Margin)
rebateCcy	String	Rebate currency
For maker sell orders of Spot and Margin, this represents the base currency. For all other cases, it represents the currency in which rebates are paid.
rebate	String	Rebate amount, only applicable to Spot and Margin
For maker sell orders: Accumulated fee and rebate amount in the unit of base currency.
For all other cases, it represents the maker rebate amount, always positive, return "" if no rebate.
source	String	Order source
6: The normal order triggered by the trigger order
7:The normal order triggered by the TP/SL order
13: The normal order triggered by the algo order
25:The normal order triggered by the trailing stop order
34: The normal order triggered by the chase order
pnl	String	Profit and loss (excluding the fee).
Applicable to orders which have a trade and aim to close position. It always is 0 in other conditions
category	String	Category
normal
twap
adl
full_liquidation
partial_liquidation
delivery
ddh: Delta dynamic hedge
auto_conversion
reduceOnly	String	Whether the order can only reduce the position size. Valid options: true or false.
cancelSource	String	Code of the cancellation source.
cancelSourceReason	String	Reason for the cancellation.
algoClOrdId	String	Client-supplied Algo ID. There will be a value when algo order attaching algoClOrdId is triggered, or it will be "".
algoId	String	Algo ID. There will be a value when algo order is triggered, or it will be "".
isTpLimit	String	Whether it is TP limit order. true or false
uTime	String	Update time, Unix timestamp format in milliseconds, e.g. 1597026383085
cTime	String	Creation time, Unix timestamp format in milliseconds, e.g. 1597026383085
quickMgnType	String	Quick Margin type, Only applicable to Quick Margin Mode of isolated margin
manual, auto_borrow, auto_repay (Deprecated)
tradeQuoteCcy	String	The quote currency used for trading.
 This interface does not contain the order data of the `Canceled orders without any fills` type, which can be obtained through the `Get Order History (last 7 days)` interface.
 As far as OPTION orders that are complete, pxVol and pxUsd will update in time for px order, pxVol will update in time for pxUsd order, pxUsd will update in time for pxVol order.
 