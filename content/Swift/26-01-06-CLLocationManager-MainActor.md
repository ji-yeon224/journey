---
tags:
  - SwiftUI
  - MainActor
date: 2025-01-06
title: Swift6에서 CLLocationManagerDelegate + @MainActor 에러 해결하기
---

### 문제
사용자의 현재 위치 정보를 가져오기 위해 LocationService를 구현하였다. 
단일 요청 기반이며 continuation을 통해 직렬적으로 상태를 관리하므로, LocationService는 @MainActor 환경에서 동작하는 것이 가장 단순하고 안전한 선택이라고 판단했다.
구현 중 CLLocationManagerDelegate를 사용하려하니 경고가 발생했다. 

![[Pasted image 20260106154708.png]]
> Conformance of 'LocationService' to protocol 'CLLocationManagerDelegate' crosses into main actor-isolated code and can cause data races; this is an error in the Swift 6 language mode

MainActor로 격리된 LocationService가 호출 컨텍스트를 증명할 수 없는 Objective-C delegate 메서드를 통해 외부에서 직접 접근될 수 있어 데이터 레이스가 발생할 가능성이 있기 때문에 Swift 6에서는 에러로 처리된다는 의미이다. 

좀 더 풀어서 설명하자면, 
CLLocationManagerDelegate는 **Objective-C 런타임 기반으로 호출되는 delegate 프로토콜**이다.
이러한 delegate 메서드는 Swift 코드가 직접 호출하는 것이 아니라, **시스템 런타임이 호출**한다.
그 결과 Swift 컴파일러는 이 delegate 메서드가 **어떤 스레드 / 어떤 actor 컨텍스트에서 호출되는지**, 특히 **MainActor에서 호출된다는 사실을 정적으로 증명할 수 없다**.

### 원인 
LocationService를 @MainActor로 정의하면 클래스 내 프로퍼티와 메서드는 MainActor 격리 상태에 놓인다.
하지만 Objective-C 런타임에서 호출되는 delegate 메서드 안에서 MainActor에 격리된 프로퍼티를 수정하려고 하면 swift 컴파일러는 **data race 가능성이 있다**고 판단하게 된다. 

delegate 메서드가 MainActor에서 실행된다는 보장이 없기 때문이다.

이 이유가 바로 위에 발생한 에러인 
**“actor 격리를 보장할 수 없다(crosses into main actor-isolated code)”**
의 의미이다.

### 해결: nonisolated
이 문제를 해결하기 위해 Objective-C 런타임에서 호출되는 delegate 메서드를 actor 격리에서 제외해야 한다. 
이를 위해 delegate 메서드 앞에 nonisolated 키워드를 붙여준다.

```swift

nonisolated func locationManager(
    _ manager: CLLocationManager,
    didUpdateLocations locations: [CLLocation]
  ) {
    guard let location = locations.last else { return }
    let coord = Coordinate(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude
    )

    Task { @MainActor in
      locationManager.stopUpdatingLocation()
      finish(coord)
     }
  }

  private func finish(_ value: Coordinate?) {
    continuation?.resume(returning: value)
    continuation = nil
  }

```

nonisolated는 어떤 actor에도 속하지 않으며 호출 컨텍스트를 보장하지 않는다는 것을 명시적으로 선언하는 것이다. 
nonisolated 메서드에서는 MainActor 격리 내에 있는 프로퍼티를 수정할 수 없다. 그렇기 때문에 상태 변경이 필요한 경우 명시적으로 MainActor로 이동해야 한다. 
```swift 
Task { @MainActor in 
	// MainActor 격리 상태 변경
}
```

이렇게 함으로써 delegate 메서드는 외부 진입점이지만 실제 상태 변경은 MainActor에서 수행됨을 보장하여 Swift6 동시성 규칙을 만족하게 된다. 

### 정리
- CoreLocation delegate 메서드는 ObjC 런타임이 호출하므로, Swift 컴파일러가 “이 호출이 항상 MainActor에서 일어난다”를 정적으로 **증명할 수 없다**.
- @MainActor 타입에서 delegate 메서드를 그대로 구현하면 actor 격리 경계를 넘어 data race가 발생할 가능성이 있다고 판단한다
- delegate 메서드를 nonisolated로 선언해 **외부 진입점임을 명확히** 하고, 실제 상태 변경은 `Task { @MainActor in ... }` 로 제한하여 **안전성을 보장**할 수 있다.
