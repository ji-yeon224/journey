---
date: 2025-09-30
title: UIWindow.Level 알아보기
tags:
  - Swift
  - UIKit
  - UIWindow
  - iOS
---
### UIWindow.Level

> The position of the window in the z-axis

`UIWindow.Level`은 각 `UIWindow`가 화면 위에서 어떤 우선순위로 표시할지 결정하기 위한 값이다.
`windowLevel` 속성을 통해 화면에 쌓이는 z-order값을 결정하게 되며, 값이 높을수록 더 위에 표시되고 사용자 이벤트 또한 먼저 받게된다.

`UIWindow.Level`은 CGFloat값으로 이루어져 있다.
![[Pasted image 20250930144629.png | 700]]

`UIWindow.Level`에 정의된 상수 값으로는 `normal`, `alert`, `statusBar` 세가지가 있다.
![[Pasted image 20250930144652.png | 600]]

#### normal
- 가장 기본 레벨(기본 값, 0.0)
- 일반적인 화면(ViewController)가 표시되는 레벨
- 대부분의 UI가 normal레벨로 올라감

#### statusBar(1000.0)
- 상태바보다 위에 위치하는 레벨

#### alert(2000.0)
- UIAlertController 같은 시스템 알림창이 표시되는 레벨
- 보통 UI 위에 나타나야 할 팝업창에 사용됨.

### WindowLevel 우선순위 제어

`windowLevel`은 우선순위 커스텀이 가능하다.
```swift
window.windowLevel = .alert + 1
```

이렇게 설정하면 해당 윈도우는 시스템 얼럿보다 더 위에 표시되어 최상단에 나타나게 된다.

### 활용 방안
앱 내에서 다른 화면보다 무조건 최상위에 떠있어야하는 경우 사용하기 좋을 것 같다.
다른 UI와 비교하는 것이 아닌 UIWindow들 간의 비교이기 때문에 무조건 위에 올린다고 할 때 사용하게 될 것 같다.

하지만 윈도우 레벨을 올리게 되면 이벤트를 독점하게 될 수 있기 때문에 꼭 필요한 경우에 신중히 사용해야한다.



[https://developer.apple.com/documentation/uikit/uiwindow/level](https://developer.apple.com/documentation/uikit/uiwindow/level)