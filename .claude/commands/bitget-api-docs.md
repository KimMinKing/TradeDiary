Flash Close Position
Copy Page

Frequency limit: 1 time/1s (User ID)

Description
close position at market price

HTTP Request
POST /api/v2/mix/order/close-positions
Request Example
curl -X POST "https://api.bitget.com/api/v2/mix/order/close-positions" \
  -H "ACCESS-KEY:your apiKey" \
  -H "ACCESS-SIGN:*" \
  -H "ACCESS-PASSPHRASE:*" \
  -H "ACCESS-TIMESTAMP:1659076670000" \
  -H "locale:zh-CN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT","productType":"USDT-FUTURES","holdSide": "long"}'


Request Parameters
Parameter	Type	Required	Description
symbol	String	No	Trading pair
holdSide	String	Optional	Position direction
1. In one-way position mode(buy or sell): This field should be left blank. Will be ignored if filled in.
2. In hedge-mode position(open or close): All positions will be closed if the field is left blank; Positions of the specified direction will be closed is the field is filled in.
long: Long position; short: Short position
productType	String	Yes	Product type
USDT-FUTURES USDT-M Futures
COIN-FUTURES Coin-M Futures
USDC-FUTURES USDC-M Futures
Response Example
{
    "code": "00000", 
    "data": {
        "successList": [
            {
                "orderId": "123", 
                "clientOid": "xxxxx",
                "symbol": "BTCUSDT"
            }
        ], 
        "failureList": [
            {
                "orderId": "1234", 
                "clientOid": "321", 
                "symbol": "BTCUSDT",
                "errorMsg": "xxx", 
                "errorCode": "xxxx"
            }
        ]
    }, 
    "msg": "success", 
    "requestTime": 1627293504612
}

Response Parameters
Parameter	Type	Description
successList	List<Object>	The collection of successfully closed orders
>orderId	String	Order ID
>clientOid	String	Customize order ID
>symbol	String	The Symbol
failureList	List<Object>	The collection of unsuccessfully closed orders
The close order may fail when the pair is in delivery or in risk control handling
>orderId	String	Order ID
>clientOid	String	Customize order ID
>symbol	String	The Symbol
>errorMsg	String	Failure reason
>errorCode	String	Failure code

Get Order Detail
Copy Page

Frequency limit: 10 times/1s (uid)

Description
Get order detail

HTTP Request
GET /api/v2/mix/order/detail
Request Example
curl "https://api.bitget.com/api/v2/mix/order/detail?symbol=ETHUSDT&orderId=1&clientOid=1&productType=usdt-futures" \
  -H "ACCESS-KEY:your apiKey" \
  -H "ACCESS-SIGN:*" \
  -H "ACCESS-PASSPHRASE:*" \
  -H "ACCESS-TIMESTAMP:1659076670000" \
  -H "locale:zh-CN" \
  -H "Content-Type: application/json" 


Request Parameters
Parameter	Type	Required	Description
symbol	String	Yes	Product ID must be capitalized
productType	String	Yes	Product type
USDT-FUTURES USDT-M Futures
COIN-FUTURES Coin-M Futures
USDC-FUTURES USDC-M Futures
orderId	String	No	Order ID
Either 'orderId' or 'clientOid' is required.
clientOid	String	No	Custom order ID
Either 'orderId' or 'clientOid' is required.
Response Example
{
    "code": "00000",
    "msg": "success",
    "requestTime": 1695823012595,
    "data": {
        "symbol": "ethusdt",
        "size": "2",
        "orderId": "123456",
        "clientOid": "77777",
        "baseVolume": "2",
        "priceAvg": "1900",
        "fee": "",
        "price": "1900",
        "state": "filled",
        "side": "buy",
        "force": "gtc",
        "totalProfits": "2112",
        "posSide": "long",
        "marginCoin": "usdt",
        "presetStopSurplusPrice": "1910",
        "presetStopSurplusType":"fill_price",
        "presetStopSurplusExecutePrice":"1911",
        "presetStopLossPrice": "1890",
        "presetStopLossType":"fill_price",
        "presetStopLossExecutePrice":"1989",
        "quoteVolume": "1900",
        "orderType": "limit",
        "leverage": "20",
        "marginMode": "cross",
        "reduceOnly": "yes",
        "enterPointSource": "api",
        "tradeSide": "",
        "posMode": "one_way_mode",
        "orderSource": "normal",
        "cancelReason": "",
        "cTime": "1627300098776",
        "uTime": "1627300098776"
    }
}

Return Parameter
Parameter	Type	Description
symbol	String	Trading pair
size	String	Amount
orderId	String	Order ID
clientOid	String	Customize order ID
baseVolume	String	Amount of coins traded
priceAvg	String	Average price
fee	String	Transaction fee
price	String	Order price
status	String	Order status
live: New order, waiting for a match in orderbook
partially_filled: Partially filled
filled: All filled
canceled: the order is cancelled
side	String	Direction
buy
sell
force	String	Order expiration date
ioc: Immediate or cancel
fok: Fill or kill
gtc: Good till canceled
post only: post only orders
totalProfits	String	Total PnL
posSide	String	Position direction
long: hedge mode long position
short: hedge mode short position
net: one-way position
marginCoin	String	Margin coin
presetStopSurplusPrice	String	Set TP
presetStopSurplusType	String	Preset Take Profit Trigger type
fill_price: market price;
mark_price: mark price
presetStopSurplusExecutePrice	String	Preset Take Profit Execution price
presetStopLossPrice	String	Set SL
presetStopLossType	String	Preset Stop Loss Trigger type
fill_price: market price;
mark_price: mark price
presetStopLossExecutePrice	String	Preset Stop Loss Execution price
quoteVolume	String	Trading amount in quoting coin
orderType	String	Order type
limit
market
leverage	String	Leverage
marginMode	String	Margin mode
isolated: isolated margin
crossed: cross margin
reduceOnly	String	Whether or not to just reduce the position.
YES
NO
enterPointSource	String	Order source
WEB: Orders created on the website
API: Orders created on API
SYS: System managed orders, usually generated by forced liquidation logic
ANDROID: Orders created on the Android app
IOS: Orders created on the iOS app
tradeSide	String	Direction
close: Close (open and close mode)
open: Open (open and close mode)
reduce_close_long: Liquidate partial long positions for hedge position mode
reduce_close_short：Liquidate partial short positions for hedge position mode
burst_close_long：Liquidate long positions for hedge position mode
burst_close_short：Liquidate short positions for hedge position mode
offset_close_long：Liquidate partial long positions for netting for hedge position mode
offset_close_short：Liquidate partial short positions for netting for hedge position mode
delivery_close_long：Delivery long positions for hedge position mode
delivery_close_short：Delivery short positions for hedge position mode
dte_sys_adl_close_long：ADL close long position for hedge position mode
dte_sys_adl_close_short：ADL close short position for hedge position mode
buy_single：Buy, one way postion mode
sell_single：Sell, one way postion mode
reduce_buy_single：Liquidate partial positions, buy, one way position mode
reduce_sell_single：Liquidate partial positions, sell, one way position mode
burst_buy_single：Liquidate short positions, buy, one way postion mode
burst_sell_single：Liquidate partial positions, sell, one way position mode
delivery_sell_single：Delivery sell, one way position mode
delivery_buy_single：Delivery buy, one way position mode
dte_sys_adl_buy_in_single_side_mode：ADL close position, buy, one way position mode
dte_sys_adl_sell_in_single_side_mode：ADL close position, sell, one way position mode
posMode	String	Position mode
one_way_mode: one-way position
hedge_mode: two-way position
orderSource	String	Order source
normal: Normal order
market: market order
profit_market: Market TP order
loss_market: Market SL order
Trader_delegate: Elite trade order
trader_profit: Trader takes profit
trader_loss: Trader stops loss
reverse: Reversed orders
trader_reverse: Reversed elite trades
profit_limit: Take-profit limit order
loss_limit: Stop-loss limit order
liquidation: Liquidation order
delivery_close_long: close long positions
delivery_close_short: close short positions
pos_profit_limit: Position take-profit limit order
pos_profit_market: Position take-profit market order
pos_loss_limit: Position stop-loss limit order
pos_loss_market: Position stop-loss market order
profit_chase: Take Profit Chase Order
loss_chase: Stop Loss Chase Order
follower_delegate: Follower Delegate Order
reduce_offset: Reduce Position Offset Order
market_risk: Best Price Risk Handling
plan_limit: Limit Plan Order
plan_market: Best Price Plan Order
pos_loss_limit: Position Stop Loss Limit
strategy_positive: Strategy-Positive Grid
strategy_reverse: Strategy-Reverse Grid
strategy_unlimited: Unlimited Strategy
move_limit: Limit Moving Take Profit and Stop Loss
move_market: Best Price Moving Take Profit and Stop Loss
tracking_limit: Limit Trailing Order
tracking_market: Best Price Trailing Order
strategy_dca_positive: DCA Strategy-Positive
strategy_dca_reverse: DCA Strategy-Reverse
strategy_oco_limit: Strategy-OCO Limit Order
strategy_oco_trigger: Strategy-OCO Trigger Order
modify_order_limit: Limit Modify Order
strategy_regular_buy: Strategy-Regular Buy
strategy_grid_middle: Strategy-Neutral Grid
cancelReason	String	Cancel reason
normal_cancel: Normal cancel
stp_cancel: Cancelled by STP
cTime	String	Creation time, ms
uTime	String	Update time, ms


Get Order Fill Details
Copy Page

Speed limit is 10 times/s for average users. Frequency limit imposed according to user ID

Description
Get order fill details

HTTP Request
GET /api/v2/mix/order/fills
Request Example
curl "https://api.bitget.com/api/v2/mix/order/fills?productType=usdt-futures" \
  -H "ACCESS-KEY:your apiKey" \
  -H "ACCESS-SIGN:*" \
  -H "ACCESS-PASSPHRASE:*" \
  -H "ACCESS-TIMESTAMP:1659076670000" \
  -H "locale:zh-CN" \
  -H "Content-Type: application/json"


Request Parameters
Parameter	Type	Required	Description
orderId	String	No	Order ID
symbol	String	No	Trading pair, e.g. ETHUSDT
productType	String	Yes	Product type
USDT-FUTURES USDT-M Futures
COIN-FUTURES Coin-M Futures
USDC-FUTURES USDC-M Futures
idLessThan	String	No	Requests the content on the page before the tradeId (older data).
startTime	String	No	Start time (time stamp in milliseconds)
(The maximum time span supported is three months. The default end time is three months if no value is set for the end time. )
(For Managed Sub-Account, the StartTime cannot be earlier than the binding time)
endTime	String	No	End time (time stamp in milliseconds)
(The maximum time span supported is three months. The default start time is three months ago if no value is set for the start time. )
limit	String	No	Number of queries: Default: 100, maximum: 100
Response Example
{
    "code": "00000",
    "data": {
        "fillList": [
            {
                "tradeId": "123",
                "symbol": "ethusdt",
                "orderId": "121212",
                "price": "1900",
                "baseVolume": "1",
                "feeDetail": [
                    {
                        "deduction": "yes",
                        "feeCoin": "BGB",
                        "totalDeductionFee": "-0.017118519726",
                        "totalFee": "-0.017118519726"
                    }
                ],
                "side": "buy",
                "quoteVolume": "1902",
                "profit": "102",
                "enterPointSource": "api",
                "tradeSide": "close",
                "posMode": "hedge_mode",
                "tradeScope": "taker",
                "cTime": "1627293509612"
            }
        ],
        "endId": "123"
    },
    "msg": "success",
    "requestTime": 1627293504612
}


Response Parameters
Parameter	Type	Description
fillList	List<Object>	Transaction details
>tradeId	String	Transaction id
>symbol	String	Trading pair
>orderId	String	Order no.
>price	String	Order price
>baseVolume	String	Amount of coins traded
>feeDetail	String	Transaction fee
>>deduction	String	Whether or not to deduct (vouchers)
>>feeCoin	String	Crypto ticker
>>totalDeductionFee	String	Total transaction fee discount
>>totalFee	String	Total transaction fee
>side	String	Type of transaction
buy: Buy
sell: Sell
>quoteVolume	String	Trading amount in quote currency
>profit	String	Profit
>enterPointSource	String	Order source
WEB: Orders created on the website
API: Orders created on API
SYS: System managed orders, usually generated by forced liquidation logic
ANDROID: Orders created on the Android app
IOS: Orders created on the iOS app
>tradeSide	String	Direction
close: Close (open and close mode)
open: Open (open and close mode)
reduce_close_long: Liquidate partial long positions for hedge position mode
reduce_close_short：Liquidate partial short positions for hedge position mode
burst_close_long：Liquidate long positions for hedge position mode
burst_close_short：Liquidate short positions for hedge position mode
offset_close_long：Liquidate partial long positions for netting for hedge position mode
offset_close_short：Liquidate partial short positions for netting for hedge position mode
delivery_close_long：Delivery long positions for hedge position mode
delivery_close_short：Delivery short positions for hedge position mode
dte_sys_adl_close_long：ADL close long position for hedge position mode
dte_sys_adl_close_short：ADL close short position for hedge position mode
buy_single：Buy, one way postion mode
sell_single：Sell, one way postion mode
reduce_buy_single：Liquidate partial positions, buy, one way position mode
reduce_sell_single：Liquidate partial positions, sell, one way position mode
burst_buy_single：Liquidate short positions, buy, one way postion mode
burst_sell_single：Liquidate partial positions, sell, one way position mode
delivery_sell_single：Delivery sell, one way position mode
delivery_buy_single：Delivery buy, one way position mode
dte_sys_adl_buy_in_single_side_mode：ADL close position, buy, one way position mode
dte_sys_adl_sell_in_single_side_mode：ADL close position, sell, one way position mode
>posMode	String	Position mode
one_way_mode: one-way position
hedge_mode: two-way position
>tradeScope	String	Trader tag
taker: Taker
maker: Maker
>cTime	String	Date of transaction
endId
String
The final order ID.
This is used when idLessThan/idGreaterThan is set as a range.
endId	String	The final Transaction ID.
This is used when idLessThan/idGreaterThan is set as a range.


Get History Order
Copy Page

Rate limit: 10 req/sec/UID

Description
Get history order(It only supports to get the data within 90days. The older data can be downloaded from web)

HTTP Request
GET /api/v2/mix/order/orders-history
Request Example
curl "https://api.bitget.com/api/v2/mix/order/orders-history?productType=usdt-futures" \
  -H "ACCESS-KEY:your apiKey" \
  -H "ACCESS-SIGN:*" \
  -H "ACCESS-PASSPHRASE:*" \
  -H "ACCESS-TIMESTAMP:1659076670000" \
  -H "locale:zh-CN" \
  -H "Content-Type: application/json"


Request Parameters
Parameter	Type	Required	Description
orderId	String	No	Order ID
If both orderId and clientOid are entered, orderId prevails.
clientOid	String	No	Customize order ID
If both orderId and clientOid are entered, orderId prevails.
symbol	String	No	Trading pair, e.g. ETHUSDT
productType	String	Yes	Product type
USDT-FUTURES USDT-M Futures
COIN-FUTURES Coin-M Futures
USDC-FUTURES USDC-M Futures
idLessThan	String	No	Requests the content on the page before this ID (older data), the value input should be the endId of the previous request response
orderSource	String	No	Order sources
normal: Normal order
market: market order
profit_market: Market TP order
loss_market: Market SL order
Trader_delegate: Elite trade order
trader_profit: Trader takes profit
trader_loss: Trader stops loss
reverse: Reversed orders
trader_reverse: Reversed elite trades
profit_limit: Take-profit limit order
loss_limit: Stop-loss limit order
liquidation: Liquidation order
delivery_close_long: close long positions
delivery_close_short: close short positions
pos_profit_limit: Position take-profit limit order
pos_profit_market: Position take-profit market order
pos_loss_limit: Position stop-loss limit order
pos_loss_market: Position stop-loss market order
startTime	String	No	Start timestamp
Unix timestamp in milliseconds format, e.g. 1597026383085
(For Managed Sub-Account, the StartTime cannot be earlier than the binding time)
endTime	String	No	End timestamp
Unix timestamp in milliseconds format, e.g. 1597026383085
limit	String	No	Number of queries: Maximum: 100, default: 100
Response Example
{
    "code": "00000",
    "data": {
        "entrustedList": [
            {
                "symbol": "ethusdt",
                "size": "100",
                "orderId": "123",
                "clientOid": "12321",
                "baseVolume": "12.1",
                "fee": "-0.00854",
                "price": "1900",
                "priceAvg": "1903",
                "status": "filled",
                "side": "buy",
                "force": "gtc",
                "totalProfits": "0",
                "posSide": "long",
                "marginCoin": "usdt",
                "quoteVolume": "22001.21",
                "leverage": "20",
                "marginMode": "crossed",
                "enterPointSource": "api",
                "tradeSide": "open",
                "posMode": "hedge_mode",
                "posAvg": "",
                "orderType": "limit",
                "orderSource": "normal",
                "cTime": "1627293504612",
                "uTime": "1627293505612",
                "presetStopSurplusPrice": "2001",
                "presetStopLossPrice": "1800"
            }
        ],
        "endId": "123"
    },
    "msg": "success",
    "requestTime": 1627293504612
}

Response Parameters
Parameter	Type	Description
endId	String	Last query ended order ID
entrustedList	List<Object>	Order list
>symbol	String	Trading pair
>size	String	Amount
>orderId	String	Order ID
>clientOid	String	Custom id
>baseVolume	String	Amount of coins traded
>fee	String	Transaction fee
>price	String	Order price
>priceAvg	String	Average order price
>status	String	Order status
filled: All filled
canceled: the order is cancelled
>side	String	Direction
buy: buy, sell: sell
>force	String	Order expiration date
(Confirm that if maker is supported)
ioc: Immediate or cancel
fok: Fill or kill
gtc: Good till canceled
post_only: Post only
>totalProfits	String	Total PnL
>posSide	String	Position direction
long: two-way long position
short: two-way short position
net: one-way position
>marginCoin	String	Margin coin
>quoteVolume	String	Trading amount in quoting coin
>leverage	String	Leverage
>marginMode	String	Margin mode
isolated: isolated margin
crossed: cross margin
>reduceOnly	String	Reduce only
YES: Yes,NO: No
>enterPointSource	String	Order source
WEB: Orders created on the website
API: Orders created on API
SYS: System managed orders, usually generated by forced liquidation logic
ANDROID: Orders created on the Android app
IOS: Orders created on the iOS app
>tradeSide	String	Direction
close: Close (open and close mode)
open: Open (open and close mode)
reduce_close_long: Liquidate partial long positions for hedge position mode
reduce_close_short：Liquidate partial short positions for hedge position mode
burst_close_long：Liquidate long positions for hedge position mode
burst_close_short：Liquidate short positions for hedge position mode
offset_close_long：Liquidate partial long positions for netting for hedge position mode
offset_close_short：Liquidate partial short positions for netting for hedge position mode
delivery_close_long：Delivery long positions for hedge position mode
delivery_close_short：Delivery short positions for hedge position mode
dte_sys_adl_close_long：ADL close long position for hedge position mode
dte_sys_adl_close_short：ADL close short position for hedge position mode
buy_single：Buy, one way postion mode
sell_single：Sell, one way postion mode
reduce_buy_single：Liquidate partial positions, buy, one way position mode
reduce_sell_single：Liquidate partial positions, sell, one way position mode
burst_buy_single：Liquidate short positions, buy, one way postion mode
burst_sell_single：Liquidate partial positions, sell, one way position mode
delivery_sell_single：Delivery sell, one way position mode
delivery_buy_single：Delivery buy, one way position mode
dte_sys_adl_buy_in_single_side_mode：ADL close position, buy, one way position mode
dte_sys_adl_sell_in_single_side_mode：ADL close position, sell, one way position mode
>posMode	String	Position mode
one_way_mode: one-way position
hedge_mode: two-way position
>orderType	String	Order type
limit: limit order
market: market order
>orderSource	String	Order sources
normal: Normal order
market: market order
profit_market: Market TP order
loss_market: Market SL order
Trader_delegate: Elite trade order
trader_profit: Trader takes profit
trader_loss: Trader stops loss
reverse: Reversed orders
trader_reverse: Reversed elite trades
profit_limit: Take-profit limit order
loss_limit: Stop-loss limit order
liquidation: Liquidation order
delivery_close_long: close long positions
delivery_close_short: close short positions
pos_profit_limit: Position take-profit limit order
pos_profit_market: Position take-profit market order
pos_loss_limit: Position stop-loss limit order
pos_loss_market: Position stop-loss market order
profit_chase: Take Profit Chase Order
loss_chase: Stop Loss Chase Order
follower_delegate: Follower Delegate Order
reduce_offset: Reduce Position Offset Order
market_risk: Best Price Risk Handling
plan_limit: Limit Plan Order
plan_market: Best Price Plan Order
pos_loss_limit: Position Stop Loss Limit
strategy_positive: Strategy-Positive Grid
strategy_reverse: Strategy-Reverse Grid
strategy_unlimited: Unlimited Strategy
move_limit: Limit Moving Take Profit and Stop Loss
move_market: Best Price Moving Take Profit and Stop Loss
tracking_limit: Limit Trailing Order
tracking_market: Best Price Trailing Order
strategy_dca_positive: DCA Strategy-Positive
strategy_dca_reverse: DCA Strategy-Reverse
strategy_oco_limit: Strategy-OCO Limit Order
strategy_oco_trigger: Strategy-OCO Trigger Order
modify_order_limit: Limit Modify Order
strategy_regular_buy: Strategy-Regular Buy
strategy_grid_middle: Strategy-Neutral Grid
off_close: Delisting liquidation
>liqPrice	String	liquidation price
>cTime	String	Creation time
>uTime	String	Last updated time
>presetStopSurplusPrice	String	Take profit price
>presetStopLossPrice	String	Stop loss price
>posAvg	String	Average position price

Cancel All Orders
Copy Page

Rate limit: 10 req/sec/UID

Description
HTTP Request
POST /api/v2/mix/order/cancel-all-orders
Request Example
curl -X POST "https://api.bitget.com/api/v2/mix/order/cancel-all-orders" \
  -H "ACCESS-KEY:your apiKey" \
  -H "ACCESS-SIGN:*" \
  -H "ACCESS-PASSPHRASE:*" \
  -H "ACCESS-TIMESTAMP:1659076670000" \
  -H "locale:zh-CN" \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "USDT-FUTURES",
    "marginCoin": "USDT"
}'


Request Parameters
Parameter	Type	Required	Description
productType	String	Yes	Product type
USDT-FUTURES USDT-M Futures
COIN-FUTURES Coin-M Futures
USDC-FUTURES USDC-M Futures
marginCoin	String	No	Margin coin, must be capitalized
requestTime	String	No	request Time Unix millisecond timestamp
receiveWindow	String	No	valid window period Unix millisecond timestamp Unix millisecond timestamp
Response Example
{
    "code": "00000",
    "data": {
        "successList": [
            {
                "orderId": "121211212122",
                "clientOid": "BITGET#121211212122"
            }
        ],
        "failureList": [
            {
                "orderId": "232",
                "clientOid": "321342",
                "errorMsg": "notExistend"
            }
        ]
    },
    "msg": "success",
    "requestTime": 1627293504612
}

Response Parameters
Parameter	Type	Description
successList	List<Object>	The collection of successfully cancelled orders.
>orderId	String	Order ID
>clientOid	String	Customize order ID
failureList	List<Object>	The collection of unsuccessfully cancelled orders.
>orderId	String	Order ID
>clientOid	String	Customize order ID
>errorMsg	String	Failure reason
>errorCode	String	Error code


