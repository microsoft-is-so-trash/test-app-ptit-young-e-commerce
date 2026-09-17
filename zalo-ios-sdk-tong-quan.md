# Tổng quan (Zalo iOS SDK)

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/tong-quan

## Giới thiệu

Zalo SDK là bộ thư viện để các ứng dụng có thể tương tác với Zalo Platform. Zalo SDK hỗ trợ:

- iOS 9.0 trở lên
- CocoaPods 1.0 trở lên

Tham khảo [Demo](https://developers.zalo.me/docs/sdk/ios-sdk/tong-quan)

## Tạo ứng dụng trên trang developer của Zalo

- Truy cập vào trang web [developer của Zalo](https://developers.zalo.me)
- Tạo ứng dụng mới và đặt tên cho ứng dụng
- Thêm nền tảng iOS và nhập bundle id của App tích hợp
- Kích hoạt ứng dụng, chuyển trạng thái sang đang hoạt động
- Ghi nhớ ID của ứng dụng và lưu thay đổi.

*(Hình minh họa: giao diện tạo ứng dụng trên trang developer Zalo, gồm các trường Bundle ID, Cert Fingerprint, Key Identifier, App ID, App Key...)*

## Cài đặt bằng CocoaPods

Thêm vào Podfile như sau:

```
pod 'ZaloSDK'
```

Nếu chưa biết về CocoaPods có thể tham khảo hướng dẫn ở [đây](https://developers.zalo.me/docs/sdk/ios-sdk/tong-quan).

## Thêm LSApplicationQueriesSchemes

Để gọi qua Zalo App để cấp quyền truy cập, và khi share message hoặc feed, thì cần thêm các LSApplicationQueriesSchemes: Main target setting -> Info -> Custom iOS Target Properties -> click + để add thêm LSApplicationQueriesSchemes

- **zalosdk**: dùng để gọi qua Zalo App khi cần cấp quyền truy cập.
- **zaloshareext**: dùng để gọi qua Zalo App khi cần share message hoặc feed.

*(Hình minh họa: cấu hình LSApplicationQueriesSchemes trong Xcode với 2 item zalosdk và zaloshareext)*

## Thêm URL Type

Để cho Zalo app, có thể gọi lại app của mình sau khi cấp quyền truy cập thì cần phải thêm một số URL types: Main target setting -> Info -> URL types -> click + để add thêm URL Type

- Zalo: identifier = "zalo", URL Schemes = "zalo-yourappid"

*(Hình minh họa: cấu hình URL Types trong Xcode, identifier "Zalo", URL Schemes "zalo-182957728093795018")*

## Khởi tạo ZaloSDK

Trước khi sử dụng ZaloSDK cần gọi phương thức `initializeWithAppId:` một lần duy nhất để khởi tạo SDK. AppId là ID của ứng dụng lấy từ trang developer của Zalo. Trong AppDelegate cần implement thêm phương thức `application:handleOpenURL:sourceApplication:annotation:` và gọi vào ZaloSDK.

```swift
import UIKit
import ZaloSDK

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {

        /// 0a. Init zalo sdk
        ZaloSDK.sharedInstance().initialize(withAppId: Constant.ZALO_APP_ID)
        return true
    }
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplicationOpenURLOptionsKey : Any] = [:]) -> Bool {
        /// 0b. Receive callback from zalo
        return ZDKApplicationDelegate.sharedInstance().application(app, open: url, options: options)
    }
}
```

---

# XCode

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/tich-hop/xcode

> Lưu ý: Tại thời điểm trích xuất, nội dung trang "XCode" trên trang tài liệu Zalo hiển thị trùng lặp hoàn toàn với nội dung trang "Tổng quan" ở trên (có thể là lỗi/nội dung chưa được cập nhật của trang tài liệu gốc).

---

# Đăng nhập

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/dang-nhap/dang-nhap

## Tổng quan các bước cần thực hiện để đăng nhập

- Tạo code verifier và code challenge
- Đăng nhập Zalo và lấy được OauthCode. Vì mặc định thì oauthCode chỉ có hiệu lực chỉ trong 10 phút, nên ngay sau khi có được oauthCode thì cần thực hiện lấy AccessToken và RefreshToken ngay.
- Dùng OauthCode để lấy AccessToken và RefreshToken:
  - AccessToken: dùng để gọi các Official Account API. Hiệu lực: mặc định là 1 giờ, server sẽ trả về thời gian expired khi gọi API get AccessToken.
  - RefreshToken: lưu lại RefreshToken ở phía app để kiểm tra đã đăng nhập hay chưa, và sử dụng để tạo lại AccessToken khi AccessToken hết hiệu lực. Hiệu lực: mặc định là 3 tháng

## Tạo code verifier và code challenge

Zalo sử dụng **code challenge** và **code verifier** (theo phương thức PKCE) để tăng độ bảo mật của quá trình xác thực và ủy quyền. Xem thêm về PKCE tại [đây](https://developers.zalo.me/docs/sdk/ios-sdk/dang-nhap/dang-nhap). Sau khi cấu hình Đăng nhập, bạn cần:

- Tạo một **code verifier** và lưu trữ trên hệ thống của bạn.
- Dùng mã hóa **code verifier** bằng bộ ký tự **ASCII**, tiếp đến dùng giải thuật **SHA-256** để tạo mã băm, sau cùng encode **Base64** mã băm để tạo ra **code challenge** từ **code verifier**.
- `code_challenge = Base64.encode(SHA-256.hash(ASCII(code_verifier)))`

Lưu ý:

- Yêu cầu sử dụng **code verifier** khác nhau cho từng request.
- **Code verifier** là code dùng để xác minh quyền sở hữu của bạn với **authorization code** bạn nhận được từ hệ thống. Vui lòng không cung cấp code này cho bên thứ ba.

## Đăng nhập Zalo và lấy được OauthCode

```swift
ZaloSDK.sharedInstance().authenticateZalo(with: ZAZAloSDKAuthenTypeViaZaloAppAndWebView,
                                          parentController: self,
                                          codeChallenge: Constant.CODE_CHALLENGE,
                                          extInfo: Constant.EXT_INFO) { (response) in
    if response?.isSucess == true {
        // Đăng nhập thành công, thực hiện get AccessToken bằng response?.oauthCode
    } else if let response = response,
              response.errorCode != kZaloSDKErrorCodeUserCancel { // not cancel
        // Đăng nhập lỗi
    }
}
```

- enum ZAZaloSDKAuthenType để tùy chọn phương pháp đăng nhập
  - ZAZaloSDKAuthenTypeViaZaloAppOnly: chỉ đăng nhập bằng app zalo, nếu ko có thì báo lỗi
  - ZAZaloSDKAuthenTypeViaWebViewOnly: đăng nhập với ưu tiên WebView
  - ZAZaloSDKAuthenTypeViaZaloAppAndWebView: Đăng nhập với thứ tự ưu tiên từ Zalo app, webview,
- codeChallenge: đã nêu ở trên.
- extInfo: optional, có thể dùng để truyền thêm thông tin lên server nếu cần.

ZOOauthResponseObject chứa các thông tin

- Integer errorCode // mã lỗi trả về, thành công khi >= 0
- String errorMessage // câu thông báo lỗi
- String oauthCode // code dùng để lấy AccessToken

---

# Lấy Access Token

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/dang-nhap/lay-access-token

## Lấy AccessToken và RefreshToken bằng OauthCode

```swift
ZaloSDK.sharedInstance().getAccessToken(withOAuthCode: oauthCode, codeVerifier: Constant.CODE_VERIFIER) { (tokenResponse) in
    if let tokenResponse = tokenResponse,
       tokenResponse.isSucess {
        // Get AccessToken thành công
    } else {
        // Get AccessToken lỗi
    }
}
```

Các param:

- oauthCode: OauthCode lấy được sau khi đăng nhập.
- codeVerifier: Code Verifier đi kèm với Code Challenge ở bước đăng nhập.

ZOTokenResponseObject chứa các thông tin

- Integer errorCode // mã lỗi trả về, thành công khi >= 0
- String errorMessage // câu thông báo lỗi
- String accessToken // dùng để gọi các Official Account API.
- String refreshToken // lưu lại RefreshToken ở phía app để tạo lại AccessToken khi AccessToken hết hiệu lực. Hiệu lực: 3 tháng
- TimeInterval expriedTime // thời gian AccessToken hết hiệu lực.

Lưu ý: cần lưu lại Refresh Token để lấy lại AccessToken sau khi AccessToken hết hạn.

## Lấy AccessToken và RefreshToken mới bằng RefreshToken

```swift
ZaloSDK.sharedInstance().getAccessToken(withRefreshToken: refreshToken) { (tokenResponse) in
    if let tokenResponse = tokenResponse,
       tokenResponse.isSucess {
        // Get AccessToken thành công
    } else {
        // Get AccessToken lỗi
    }
}
```

ZOTokenResponseObject chứa các thông tin (giống như trên): errorCode, errorMessage, accessToken, refreshToken, expriedTime.

Lưu ý: RefreshToken chỉ sử dụng để lấy AccessToken được một lần duy nhất. Sau khi lấy AccessToken xong thì cần lưu lại RefreshToken mới được trả về kèm với AccessToken.

---

# Xác minh lại RefreshToken

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/dang-nhap/xac-minh-lai-refresh-token

ZaloSDK hỗ trợ method validateRefreshToken để kiểm tra RefreshToken có còn hiệu lực hay không:

```swift
ZaloSDK.sharedInstance().validateRefreshToken(refreshToken, extInfo: Constant.EXT_INFO) { (response) in
      if response?.isSucess == true {
          // RefreshToken vẫn còn hiệu lực
      } else {
          // RefreshToken không còn hiệu lực
      }
}
```

Lưu ý: ZaloSDK không hỗ trợ việc lưu lại session đăng nhập mà phía app sẽ tự quản lí việc này. Có thể sử dụng hình thức lưu lại RefreshToken ở local, và dùng method validateRefreshToken để xác minh session đăng nhập có đang còn hiệu lực hay không.

---

# Đăng xuất

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/dang-nhap/dang-xuat

Khi đăng xuất, các thông tin đăng nhập cơ bản như login channel, displayname sẽ bị xóa: (oauth code, token, và userId app sẽ tự quản lý)

```swift
ZaloSDK.sharedInstance().unauthenticate()
```

---

# Lấy thông tin profile

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/open-api/lay-thong-tin-profile

## Response response.data là dictionary như sau:

```json
{
    "id": "UserId",
    "name": "User Name",
    "picture": {
        "data": {
            "url": "User avatar url"
        }
    }
}
```

## Sample code

```swift
ZaloSDK.sharedInstance().getZaloUserProfile(withAccessToken: accessToken) { (response) in
    if response?.errorCode == ZaloSDKErrorCode.sdkErrorCodeNoneError.rawValue {
        // Thành công
    } else {
        // Có lỗi xảy ra
    }
}
```

- accessToken: xem lại việc lấy accessToken tại bước Lấy AccessToken

---

# Câu hỏi thường gặp

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/references/cau-hoi-thuong-gap

**Câu hỏi:** thời gian expired mặc định của các thông tin OauthCode, AccessToken, RefreshToken là bao lâu?
**Trả lời:**

- OauthCode: 10 phút.
- AccessToken: 1 giờ.
- RefreshToken: 3 tháng.

**Câu hỏi:** làm thế nào để kiểm tra RefreshToken có còn hiệu lực hay không?
**Trả lời:** RefreshToken có hiệu lực là 3 tháng. Tuy nhiên nếu 1 RefreshToken được dùng để lấy AccessToken, thì sẽ bị hết hiệu lực sau khi lấy. Do đó cần lưu lại RefreshToken mới mỗi khi lấy AccessToken bằng RefreshToken. Zalo SDK có cung cấp method để kiểm tra RefreshToken có còn hiệu lực hay không: xem tại Xác minh lại RefreshToken

**Câu hỏi:** CodeChallenge và CodeVerifier là gì?
**Trả lời:** Zalo sử dụng **code challenge** và **code verifier** (theo phương thức PKCE) để tăng độ bảo mật của quá trình xác thực và ủy quyền. Xem thêm về PKCE tại đây.

---

# Mã lỗi

Nguồn: https://developers.zalo.me/docs/sdk/ios-sdk/references/ma-loi

| Mã lỗi | Tên | Ghi chú |
|---|---|---|
| 0 | kZaloSDKErrorCodeNoneError | Không có lỗi |
| -5000 | kZaloSDKErrorCodeAppIdInvalid | App id is invalid |
| -5001 | kZaloSDKErrorCodeRequiredLogin | Invalid callback url |
| -5002 | kZaloSDKErrorCodeInvalidSecretKey | Invalid client secret |
| -5003 | kZaloSDKErrorCodeInvalidOauthCode | Invalid oauthorized code |
| -5004 | kZaloSDKErrorCodeInvalidAccessToken | Invalid access token |
| -5005 | kZaloSDKErrorCodeInvalidIOSBundleID | Invalid ios bundle id |
| -5006 | kZaloSDKErrorCodeInvalidAndroidPackageName | Invalid android package |
| -5007 | kZaloSDKErrorCodeInvalidSessionId | Invalid session |
| -5008 | kZaloSDKErrorCodeInvalidAndroidSignKey | Invalid android sign key |
| -5009 | kZaloSDKErrorCodeInvalidCodeChallenge | Invalid code challenge |
| -5010 | kZaloSDKErrorCodeInvalidCodeVerfifier | Invalid code verifier |
| -5011 | kZaloSDKErrorCodeInvalidRefreshToken | Invalid refresh token |
| -5012 | kZaloSDKErrorCodeInvalidOAID | Invalid oa id |
| -5013 | kZaloSDKErrorCodeInvalidBodyData | Invalid body data |
| -5014 | kZaloSDKErrorCodeInvalidParameter | Invalid required params |
| -5015 | kZaloSDKErrorCodeInvalidGrantType | Invalid grant type |
| -5016 | kZaloSDKErrorCodeAuthorizedCodeExpired | Authorized code expired |
| -5017 | kZaloSDKErrorCodeRefreshTokenExpired | Refresh token expired |
| -5018 | kZaloErrorCodeInvalidState | Invalid state |
| -5019 | kZaloErrorCodeRefreshTokenIsNotGuestRefreshToken | Refresh token is not guest refresh token |
| -6000 | kZaloSDKErrorCodeUserIsInvalid | User is invalid |
| -6001 | kZaloSDKErrorCodeInvalidPermission | Invalid Permission (not in white list) |
| -6002 | kZaloSDKErrorCodeDidNotLogin | User not login |
| -6003 | kZaloSDKErrorCodeUserConsentFail | User not consent |
| -6004 | kZaloSDKErrorCodeUserNotOwnOa | User not own OA |
| -6005 | kZaloSDKErrorCodeUserBanned | User banned |
| -7000 | kZaloSDKErrorCodeInvalidCsrfToken | Invalid csrf token |
| -7001 | kZaloSDKErrorCodeCreateAccessTokenFail | Cannot create access token |
| -7002 | kZaloSDKErrorCodeCreateOauthCodeFail | Could not create Authorized code. |
| -7003 | kZaloSDKErrorCodeHadAnErrorWhenVerifySessionUser | Had an error when verify session user |
| -7004 | kZaloSDKErrorCodeYourApplicationMightBeNotApproveOrDisableByAdmin | Your application might be not approve or disable by admin |
| -7005 | kZaloSDKErrorGuestRecoveryFailed | Process forgot passwd guest account failed |
| -7006 | kZaloSDKErrorCodeBuildRedirectUriFailed | Build redirect uri failed |
| -7011 | kZaloSDKErrorCouldNotLoginToGooglePlus | Could not login to Google Plus |
| -7012 | kZaloSDKErrorCouldNotLoginToFacebook | Could not login to Facebook |
| -7013 | kZaloSDKErrorCouldNotLoginToZingMe | Could not login to ZingMe |
| -7014 | kZaloSDKErrorCodeAuthenticationFailed | Authentication failed |
| -7015 | kZaloSDKErrorCodeAuthenticationExceeded | Authentication exceeded |
| -7016 | kZaloSDKErrorCodeAccountInvalid | Account invalid |
| -7017 | kZaloSDKErrorCodeRequestInvalid | Request invalid |
| -7018 | kZaloSDKErrorCodeAccountNotFound | Account not found |
| -7019 | kZaloSDKErrorCodeDataNotFound | Data not found |
| -7020 | kZaloSDKErrorCodePermissionDenied | Permission denied |
| -7021 | kZaloSDKErrorCodeRequestCanceled | Request canceled |
| -7022 | kZaloSDKErrorCodeUnSupportVersion | UnSupport version |
| -7023 | kZaloSDKErrorCodeRequiredZaloInstalled | Required Zalo installed |
| -7024 | kZaloSDKErrorCodeServerConnection | kZaloSDKErrorCodeServerConnection |
| -7025 | kZaloSDKErrorCodeTimeOutRequest | TimeOut Request |
| -7026 | kZaloSDKErrorGuestProtectionFailed | Guest protection failed |
| -7027 | kZaloSDKErrorGuestProtectionSuccess | Guest protection success |
| -7028 | kZaloSDKErrorGuestProtectionEmailPasswordMissing | Guest protection: Email or Password missing |
| -7029 | kZaloSDKErrorGuestRecoverySuccess | Guest recovery success |
| -7030 | kZaloSDKErrorGuestRecoveryEmailPasswordMissing | Guest recovery: Email or Password missing |
| -7031 | kZaloSDKErrorMissingCMND | Missing CMND |
| -7032 | kZaloSDKErrorRegisterCMNDSuccess | Register CMND success |
| -7033 | kZaloSDKErrorAppleIOSNotSupported | Apple iOS not supported |
| -7034 | kZaloSDKErrorAppleIOSLoginError | Apple iOS login error |
| -7035 | kZaloSDKErrorCodeUserCancel | User cancel |
| -8000 | kZaloSDKErrorCodeUnknownException | There was an unknown error |
| -9000 | kZaloSDKErrorCodeGraphAPIInvalidParameter | Invalid parameter |
| -9001 | kZaloSDKErrorCodeGraphAPIInvalidUserId | Invalid user id |
| -9002 | kZaloSDKErrorCodeGraphAPICantResolveToAValidUserId | Can't resolve to a valid user ID |
| -9003 | kZaloSDKErrorCodeGraphAPIYourAppDontLinkWithAnyOfficialAccount | Your app don't link with any Official Account |
| -9004 | kZaloSDKErrorCodeGraphAPIUserNotVisible | User not visible |
| -9005 | kZaloSDKErrorCodeGraphAPIAccessingFriendRequestsRequiresTheExtendedPermissionRead_Requests | Accessing friend requests requires the extended permission read_requests |
| -9006 | kZaloSDKErrorCodeGraphAPISessionKeyInvalid | Session key invalid. This could be because the session key has an incorrect format or because the user has revoked this session |
| -9007 | kZaloSDKErrorCodeGraphAPISendingOfRequestsHasBeenTemporarilyDisabledForThisApplication | Sending of requests has been temporarily disabled for this application |
| -9008 | kZaloSDKErrorCodeGraphAPISyntaxError | Syntax error |
| -9009 | kZaloSDKErrorCodeGraphAPICallFail | Call fail |
| -9010 | kZaloSDKErrorCodeGraphAPIMethodIsNotSupportForThisApi | Method is not support for this api |
| -9011 | kZaloSDKErrorCodeGraphAPIUnknownException | Unkown exception |
| -9012 | kZaloSDKErrorCodeGraphAPIItemNotExits | Item not exits |
| -9013 | kZaloSDKErrorCodeGraphAPIAppIdInUseIsDisabledOrBanded | App Id in use is disabled or banded |
| -9014 | kZaloSDKErrorCodeGraphAPIQuotaForYourAppIsLimited | Quota for your app is limited |
| -9015 | kZaloSDKErrorCodeGraphAPILimitOfFriendsListIsTooLarge_MaximumIs50 | Limit of friends list is too large. Maximum: 50 |
| -9016 | kZaloSDKErrorCodeGraphAPIQuotaDailyForYourAppIsLimited | Quota daily for your app is limited |
| -9017 | kZaloSDKErrorCodeGraphAPIQuotaWeeklyForYourAppIsLimited | Quota weeky for your app is limited |
| -9018 | kZaloSDKErrorCodeGraphAPIQuotaMonthlyForYourAppIsLimited | Quota monthly for your app is limited |
| -9019 | kZaloSDKErrorCodeGraphAPIQuotaMonthlyForYourAppIsLimited2 | Quota monthly for your app is limited |
| -9020 | kZaloSDKErrorCodeGraphAPIUserHasNotPlayedGameFor30DaysAgo | User has not played game for 30 days ago |
| -9021 | kZaloSDKErrorCodeGraphAPIDoNotDisturbUserUserHasntTalkedToFriendFor30DaysAgo | Do not disturb user. User hasn't talked to friend for 30 days ago |
| -9022 | kZaloSDKErrorCodeGraphAPIRecipientWasReachedQuotaMessageReceive_1MessagePer3Days | Recipient was reached quota message recieve (1 message per 3 days) |
| -9023 | kZaloSDKErrorCodeGraphAPISenderAndRecipientIsNotFriend | Sender and Recipient is not friend |
| -9024 | kZaloSDKErrorCodeGraphAPIQuotaDailyPerUserForYourAppIsLimited | Quota daily per user for your app is limited |
| -9025 | kZaloSDKErrorCodeGraphAPIYourFriendIsNotUsingApp | Your friend is not using app |
| -9026 | kZaloSDKErrorCodeGraphAPIYourFriendIsUsingApp | Your friend is using app |

---

# ANDROID SDK

# Tổng quan (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/tong-quan

Zalo SDK là bộ thư viện để các app có thể tương tác với Zalo Platform. Zalo SDK bao gồm các chức năng chính như sau:

- Đăng nhập bằng tài khoản Zalo
- Hỗ trợ app lấy thông tin profile của user, danh sách bạn bè
- Hiện tại Zalo SDK hỗ trợ tất cả các thiết bị cài đặt hệ điều hành Android 4.3 (API 18) trở lên.

**Hỗ trợ**

Nếu trong quá trình tích hợp có thắc mắc gì bạn có thể:

- Liên hệ trực tiếp qua email với team SDK để được trợ giúp
- Tham khảo Demo

---

### Bước 1:

Vào trang web http://developers.zalo.me tạo ứng dụng mới cho Android. Cần điền đầy đủ các thông tin:

- Package name
- Base64 của sha1 sign key

Để lấy được Base64 của sha1 sign key, có thể dùng đoạn code sau: (lưu ý cần điền release signkey khi chuẩn bị publish app)

```java
public static String getApplicationHashKey(Context ctx) throws Exception {
    PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), PackageManager.GET_SIGNATURES);
    for (Signature signature : info.signatures) {
        MessageDigest md = MessageDigest.getInstance("SHA");
        md.update(signature.toByteArray());
        String sig = Base64.encodeToString(md.digest(), Base64.DEFAULT).trim();
        if (sig.trim().length() > 0) {
            return sig;
        }
    }
}
```

### Bước 2:

Thêm thư viện ZaloSDK vào build gradle

Trong file build.gradle của app thêm các config sau :

1. Thêm url repo bên trong block `repositories`

```gradle
repositories {
    maven {
        url "https://gitlab.com/api/v4/projects/50747855/packages/maven"
    }
}
```

2. Thêm các dependencies

```gradle
implementation "me.zalo:sdk-core:+"
implementation "me.zalo:sdk-auth:+"
implementation "me.zalo:sdk-openapi:+"
```

### Bước 3:

Lấy app id từ trang http://developers.zalo.me và thêm vào file **strings.xml**

```xml
<string name="appID"> ... </string>
```

Thêm thẻ metadata cho appID trong AndroidManifest.xml:

```xml
<!-- Required zalo app id -->
 <meta-data
      android:name="com.zing.zalo.zalosdk.appID"
      android:value="@string/appID" />
```

**Lưu ý**: AppID cần được thêm vào strings.xml theo hướng dẫn ở trên, không gán trực tiếp chuỗi appID trong thẻ metaData sẽ gây ra lỗi ZaloSDK không nhận dạng được appID.

### Bước 4:

Trong file AndroidManifest thêm attribute name của Application như sau:

```xml
<application android:name="com.zing.zalo.zalosdk.oauth.ZaloSDKApplication" />
```

Trường hợp nếu app có class Application riêng thì trong method onCreate của Application phải gọi:

```java
public class DemoApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        ZaloSDKApplication.wrap(this);
    }
}
```

### Bước 5:

Thêm activity để login Zalo bằng Web:

```xml
<activity android:name="com.zing.zalo.zalosdk.oauth.BrowserLoginActivity"
android:exported="true">

    <intent-filter>
        <action android:name="android.intent.action.VIEW" />

        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="zalo-xxxxx" />
    </intent-filter>
</activity>
```

**Lưu ý**: - Thay xxxxx bằng appid của ứng dụng lấy trên trang developers - Với app target android 11 (api >=30) trở lên khai báo thêm trong manifest để có thể mở được ZaloApp

```xml
<queries>
        <package android:name="com.zing.zalo" />
</queries>
```

- Với app target android 12 (api >=31) trở lên khai báo thêm android:exported="true" để nhận được callback khi login bằng Browser

### Bước 6:

Thêm proguard cho zaloSDK:

```
-keep class com.zing.zalo.\*\*{ \*; }
-keep enum com.zing.zalo.\*\*{ \*; }
-keep interface com.zing.zalo.\*\*{ \*; }
```

Các thay đổi quan trọng ở V4 mời xem thêm tại (link)

---

# Thay đổi quan trọng trên SDK V4

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/tich-hop/thay-doi-quan-trong-tren-sdk-v4

- Các thông tin như uid, oauth code, token SDK không lưu mà sẽ trả về app. App sẽ quản lý các thông tin này sau khi login/logout.
- App cung cấp **code_challenge** để thực hiện login, **code_verifier** để lấy access token truy cập api . Cách lấy tham khảo tại: Đăng nhập
- OauthCode được trả sau khi login chỉ có giá trị sau 10p, và chỉ được dùng một lần để gọi lấy access token. Các lần sau sẽ dùng refresh token để lấy lại access token mới. Cách lấy tham khảo: tại đây

---

# Đăng nhập (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/dang-nhap/

## Tổng quan các bước cần thực hiện để đăng nhập

- Tạo code verifier và code challenge
- Đăng nhập Zalo và lấy được OauthCode. Vì mặc định thì oauthCode chỉ có hiệu lực chỉ trong 10 phút, nên ngay sau khi có được oauthCode thì cần thực hiện lấy AccessToken và RefreshToken ngay.
- Dùng OauthCode để lấy AccessToken và RefreshToken:
  - AccessToken: dùng để gọi các Official Account API Hiệu lực: mặc định là 1 giờ, server sẽ trả về thời gian expired khi gọi API get AccessToken.
  - RefreshToken: lưu lại RefreshToken ở phía app để kiểm tra đã đăng nhập hay chưa, và sử dụng để tạo lại AccessToken khi AccessToken hết hiệu lực. Hiệu lực: mặc định là 3 tháng.

## Tạo code verifier và code challenge

Zalo sử dụng **code challenge** và **code verifier** (theo phương thức PKCE) để tăng độ bảo mật của quá trình xác thực và ủy quyền. Xem thêm về PKCE tại đây. Sau khi cấu hình Đăng nhập, bạn cần:

- Tạo một **code verifier** và lưu trữ trên hệ thống của bạn.
- Dùng mã hóa **code verifier** bằng bộ ký tự **ASCII**, tiếp đến dùng giải thuật **SHA-256** để tạo mã băm, sau cùng encode **Base64** mã băm để tạo ra **code challenge** từ **code verifier**.
- code_challenge = Base64.encode(SHA-256.hash(ASCII(code_verifier)))

**Lưu ý:**

- Yêu cầu sử dụng **code verifier** khác nhau cho từng request.
- **Code verifier** là 1 chuỗi bất kỳ, format có đủ chữ hoa, chữ thường, số và dài 43 ký tự.
- **Code verifier** là code dùng để xác minh quyền sở hữu của bạn với **authorization code** bạn nhận được từ hệ thống. Vui lòng không cung cấp code này cho bên thứ ba.

## Bước 1: Gọi API authenticate

Có 2 cách gọi:

```
ZaloSDK.Instance.authenticateZaloWithAuthenType (Activity, LoginVia loginVia, String codeChallenge, OAuthCompleteListener) //default extInfo null

ZaloSDK.Instance.authenticateZaloWithAuthenType (Activity, LoginVia loginVia, String codeChallenge, JSONObject extInfo, OAuthCompleteListener)
```

Trong đó:

- LoginVia có 3 tùy chọn đăng nhập:

| Enum | Định nghĩa |
|---|---|
| APP | Đăng nhập bằng Zalo App |
| WEB | Đăng nhập bằng Webview |
| APP_OR_WEB | Đăng nhập bằng Zalo App, nếu máy không cài Zalo app sẽ dùng Webview |

- codeChallenge: cách tạo tham khảo tại (đây)
- extInfo: (optional) thông tin bổ sung app muốn truyền thêm
- OauthCompleteListener để nhận kết quả đăng nhập:

```java
OAuthCompleteListener listener = new OAuthCompleteListener() {
    @Override
    public void onAuthenError(ErrorResponse errorResponse) {
        //Đăng nhập thất bại..
    }

    @Override
    public void onGetOAuthComplete(OauthResponse response) {
        String code = response.getOauthCode()
            //Đăng nhập thành công..
    }
};
```

## Bước 2: Override onActivityResult của activity login

```java
@Override
protected void onActivityResult(int reqCode, int resCode, Intent d) {
    super.onActivityResult(requestCode, resultCode, data);
    ZaloSDK.Instance.onActivityResult(this, reqCode, resCode, d);
}
```

---

# Lấy Access Token (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/dang-nhap/lay-access-token

Ở V4 SDK sẽ cung cấp 2 api để app lấy access token sau khi đã login

**Lấy bằng Oauth Code:** App dùng oauthCode SDK trả về ở bước Login

```java
ZaloSDK.Instance.getAccessTokenByOAuthCode( Context ctx,String oacode, String codeVerifier, new ZaloOpenAPICallback() {
    @Override
    public void onResult(JSONObject data) {
        int err = data.optInt("error");
        if (err == 0) {
            //clearOauthCodeInfo(); //clear used oacode

            access_token = data.optString("access_token");
            refresh_token = data.optString("refresh_token");
            long expires_in = Long.parseLong(data.optString("expires_in"));

            //Store data token in app cache
            ....
        }
    }
});
```

Tham số:

- **ctx**: application context
- **oacode**: code sau khi login
- **codeVerifier**: code app tự gen. Tham khảo tại đây
- **callback**: override method onResult để nhận json trả về.

Data trả về:

- **access_token**: token để gọi api.
- **refresh_token**: token để làm mới access_token. Thời gian 3 tháng. Sau khi hết hiệu lực, đi lại flow login mới. Xác minh refresh token bằng api tại đây
- **expires_in**: thời gian hiệu lực của access_token (default 3600s)

**Lưu ý**: cần lưu lại Refresh Token để lấy lại AccessToken sau khi AccessToken hết hạn. **Lấy bằng Refresh Token:**

```java
ZaloSDK.Instance.getAccessTokenByRefreshToken(Context ctx,String refresh_token, new ZaloOpenAPICallback() {
    @Override
    public void onResult(JSONObject data) {
        int err = data.optInt("error");
        if (err == 0) {
            access_token = data.optString("access_token");
            refresh_token = data.optString("refresh_token");
            long expires_in = Long.parseLong(data.optString("expires_in"));

            //Update new data token in app cache
            ....
        }
    }
});
```

Tham số:

- **ctx**: application context
- **refreshToken**: token lấy từ app cache.
- **callback**: override method onResult để nhận json trả về.

**Lưu ý**: RefreshToken chỉ sử dụng để lấy AccessToken được một lần duy nhất. Sau khi lấy AccessToken xong thì cần lưu lại RefreshToken mới được trả về kèm với AccessToken.

---

# Xác minh lại Refresh Token (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/dang-nhap/xac-minh-lai-refresh-token

SDK cung cấp method để kiểm tra refresh token còn hiệu lực:

```java
ZaloSDK.Instance.isAuthenticate(refreshToken, new ValidateCallback() {

    @Override
    public void onValidateComplete(boolean validated, int errorCode, OauthResponse oauthResponse) {
        if (validated) {
            // refreshToken còn hiệu lực...
            long expireTime = oauthResponse.getExpireTime();
        }

    }
});
```

Lưu ý: ZaloSDK không hỗ trợ việc lưu lại session đăng nhập mà phía app sẽ tự quản lí việc này. Có thể sử dụng RefreshToken để xác minh session đăng nhập có đang còn hiệu lực hay không.

---

# Đăng xuất (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/dang-nhap/dang-xuat

Khi đăng xuất, các thông tin đăng nhập cơ bản như login channel, displayname sẽ bị xóa: (oauth code, token , và userId app sẽ tự quản lý)

```java
ZaloSDK.Instance.unauthenticate();
```

---

# Lấy thông tin profile (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/open-api/lay-thong-tin-profile

SDK cung cấp API để lấy thông tin người dùng sau khi đăng nhập thành công:

```java
ZaloSDK.Instance.getProfile(
    Context ctx,String access_token, ZaloOpenAPICallback callback, String[] fields)
```

Tham số:

- ctx: application context
- access_token: được lấy ở mục (link)
- callback: override method onResult để nhận json trả về từ open api. Ví dụ:

```json
{
    "id": "UserId",
    "name": "User Name",
    "picture": {
        "data": {
            "url": "User avatar url"
        }
    }
}
```

- fields : id, picture, name

---

# Câu hỏi thường gặp (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/references/cau-hoi-thuong-gap

Câu hỏi: thời gian expired mặc định của các thông tin OauthCode, AccessToken, RefreshToken là bao lâu? Trả lời:

- OauthCode: 10 phút.
- AccessToken: 1 giờ.
- RefreshToken: 3 tháng.

Câu hỏi: làm thế nào để kiểm tra RefreshToken có còn hiệu lực hay không? Trả lời: RefreshToken có hiệu lực là 3 tháng. Tuy nhiên nếu 1 RefreshToken được dùng để lấy AccessToken, thì sẽ bị hết hiệu lực sau khi lấy. Do đó cần lưu lại RefreshToken mới mỗi khi lấy AccessToken bằng RefreshToken. Zalo SDK có cung cấp method để kiểm tra RefreshToken có còn hiệu lực hay không: xem tại Xác minh lại RefreshToken

Câu hỏi: CodeChallenge và CodeVerifier là gì? Trả lời: Zalo sử dụng **code challenge** và **code verifier** (theo phương thức PKCE) để tăng độ bảo mật của quá trình xác thực và ủy quyền. Xem thêm về PKCE tại đây.

---

# Mã lỗi (Android SDK)

Nguồn: https://developers.zalo.me/docs/sdk/android-sdk/references/ma-loi

| Mã lỗi | Mô tả |
|---|---|
| -5000 | App id is invalid |
| -5001 | Invalid callback url |
| -5002 | Invalid client secret |
| -5003 | Invalid oauthorized code |
| -5004 | Invalid access token |
| -5005 | Invalid ios bundle id |
| -5006 | Invalid android package |
| -5007 | Invalid Session |
| -5008 | Invalid android sign key |
| -5009 | Invalid code challenge |
| -5010 | Invalid code verifier |
| -5011 | Invalid refresh token |
| -5012 | Invalid oa id |
| -5013 | Invalid body data |
| -5014 | Invalid required params |
| -5015 | Invalid grant type |
| -5016 | Authorized code expired |
| -5017 | Refresh token expired |
| -5018 | Invalid state |
| -5019 | Refresh token is not guest refresh token |
| -6000 | user is invalid |
| -6001 | Invalid Permission (not in white list) |
| -6002 | User not login |
| -6003 | User not consent |
| -6004 | User not own OA |
| -6005 | User banned |
| -7000 | Invalid csrf token |
| -7001 | Cannot create access token |
| -7002 | Could not create Authorized code. |
| -7003 | Had an error when verify session user |
| -7004 | Your application might be not approve or disable by admin |
| -7005 | Process forgot passwd guest account failed |
| -7006 | Build redirect uri failed |
| -7007 | WEB_VIEW_LOGIN_NOT_ALLOWED |
| -7008 | USER_BACK |
| -7009 | USER_REJECT |
| -7010 | ZALO_WEBVIEW_COOKIE_ERROR |
| -7011 | CANT_LOGIN_GOOGLE |
| -7012 | CANT_LOGIN_FACEBOOK |
| -7013 | CANT_LOGIN_ZINGME |
| -8000 | There was an unknown error |
| -8001 | NO_NETWORK |
| -9000 | Invalid parameter |
| -9001 | Invalid user id |
| -9002 | Can't resolve to a valid user ID |
| -9003 | Your app don't link with any Official Account |
| -9004 | User not visible |
| -9005 | Accessing friend requests requires the extended permission read_requests |
| -9006 | Session key invalid. This could be because the session key has an incorrect format, or because the user has revoked this session |
| -9007 | Sending of requests has been temporarily disabled for this application |
| -9008 | Syntax error |
| -9009 | Call fail |
| -9010 | Method is not support for this api |
| -9011 | Unkown exception |
| -9012 | Item not exits |
| -9013 | App Id in use is disabled or banded |
| -9014 | Quota for your app is limited |
| -9015 | Limit of friends list is too large. Maximum: 50 |
| -9016 | Quota daily for your app is limited |
| -9017 | Quota weeky for your app is limited |
| -9018 | Quota monthly for your app is limited |
| -9019 | Quota monthly for your app is limited |
| -9020 | User has not played game for 30 days ago |
| -9021 | Do not disturb user. User hasn't talked to friend for 30 days ago |
| -9022 | Recipient was reached quota message recieve (1 message per 3 days) |
| -9023 | Sender and Recipient is not friend |
| -9024 | Quota daily per user for your app is limited |
| -9025 | Your friend is not using app |
| -9026 | Your friend is using app |
