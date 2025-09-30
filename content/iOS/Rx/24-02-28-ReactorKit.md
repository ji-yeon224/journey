---
date: 2024-02-28
tags:
  - RxSwift
  - ReactorKit
  - Swift
title: ReactorKit 알아보기
---

최근 프로젝트에서 적용한 ReactorKit에 대하여 정리해보고자 한다.

이전에 RxSwift + MVVM Input-Output 패턴을 적용하여 개발했는데, ReactorKit 구조와 비슷하다는 이야기를 들어서 한 번 적용해보았다.

## 특징
- 단방향 흐름을 가진 반응형 프레임워크이다.
- RxSwift와 필수적으로 함께 사용된다. RxSwift의 Observable을 통해 비동기적으로 데이터를 처리하고, 사용자의 이벤트 처리와 UI 업데이트 쉽게 관리할 수 있다.
- View와 Reactor로 구성되어있고, Reactor가 ViewModel과 같은 역할을 한다. 네트워크 통신이나 db 접근 등 비즈니스 로직을 구성하게 된다.

## 기본 동작
![[Pasted image 20250924090223.png]]

1. Reactor에는 View에서 받은 Action과 작업(Mutation)을 미리 정의해둔다.
2. View에서 발생하는 이벤트는 Reactor에 정의된 Action으로 바인딩하여 Reactor에 전달한다.
3. Reactor에서는 Action을 전달받아 `mutate()`와 `reduce()`를 거쳐 작업 결과를 State에 담아 View로 방출한다.
4. View에서는 State를 구독하고 있기 때문에 데이터가 변경되면 전달 받은 데이터를 UI에 업데이트 한다.

## View
사용자 이벤트를 Reactor에 전달하고, Reactor에서 전달받은 State를 반영을 담당한다.  
필수 구현은 `bind(reactor: Reactor)` 메서드이지만 가독성을 위해 bind를 Action과 State를 나누어 정의한다.  
bind 메서드에 모두 정의하여도 상관 없다.

**bindAction()**
- View에서 일어나는 Action을 Reactor에 전달

**bindState()**
- Reactor에서 방출하는 State를 구독

하나의 bind 메서드 내에서 모두 처리해도 되지만 편의와 가독성을 위해 actin과 state를 분리하는 구조로 사용하도록 했다.

```swift
final class SampleViewController: UIViewController, View { // ** View Protocol 채택
    
	var disposeBag = DisposeBag() // ** 필수 구현
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.reactor = SampleReactor() // ** 필수 구현
    }
    
    func bind(reactor: SampleReactor) { // ** 필수 구현
        bindAction(reactor: reactor)
        bindState(reactor: reactor)
    }
    
    private func bindAction(reactor: SampleReactor) {
        textfiled.rx.text.orEmtpy
            .map { Reactor.Action.changeName(name: "Anne")}
            .bind(to: reactor.action)
            .disposed(by: disposeBag)
    }
    
    private func bindState(reactor: SampleReactor) {
        reactor.state
            .map { $0.name }
            .distinctUntilChanged()
            .bind(with: self) { owner, name in
                print(name)
            }
            .disposed(by: disposeBag)
        
        reactor.state
	        .map { $0.message }
	        .distinctUntilChanged()
	        .bind(with: self) { owner, message in
			    owner.showAlertMessage.accept(message)
	        }
	        .disposed(by: disposeBag)
    }
}
```


## Reactor
View에서 전달받은 이벤트(action)에 따라 비즈니스 로직을 수행하는 역할을 담당한다.

**Action**
- View에서 받을 Action 정의

**Mutation**
- 받은 Action에 대해 처리해야 할 작업

**State**
- View에게 전달한 State 값을 관리하고, 값이 변경되면 View에 방출

```swift
import Foundation
import ReactorKit

final class SampleReactor: Reactor {
	// State 초기화
    var initialState: State = State(
	    name: "",
	    message: nil
    )
    
    enum Action {
        case changeName(name: String)
    }
    
    enum Mutation {
	    case saveName(name: String)
	    case alertMessage(String)
	}
    
    struct State {
	    var name: String
	    var message: String?
    }
}
```
![[Pasted image 20250924091202.png]]
Reactor 내부에서 작업을 처리하기 위한 필수 메서드인 mutate()와 reduce()가 있다.


**mutate(action: Action)**
- View에서 전달받은 Action을 받아 해당하는 작업을 수행한다.
- 작업이 완료된 후에는 `Observable<Mutation>` 타입을 반환한다.
- 비동기 작업과 같은 작업을 mutate에서 수행하게 된다.

**reduce(state: State, mutation: Mutation)**
- 수행한 작업(mutation)을 받아서 state를 변경한다.
- 변경된 State를 구독하고 있는 View에게 전달한다.

```swift
func mutate(action: Action) -> Observable<Mutation> {
    switch action {
    case let .changeName(name):
        return changeName(name)
    }
}

func reduce(state: State, mutation: Mutation) -> State {
    var newState = state
    
    switch mutation {
    case let .saveName(newName):
        newState.name = newName
    case let .alertMessage(message):
	    newState.message = message
    }
    return newState
}

func changeName(_ name: String) -> Observable<Mutation> {
	let newName: String = "\(name)님"
	return .concat(
        .just(.saveName(name: newName)),
        .just(.alertMessage("변경이 완료되었습니다."))
	)
}
```

### @Pulse
ReactorKit을 사용하다보면 마주치는 불편함이 있다.
state 중 하나라도 변경되면 다른 state에도 이벤트가 전달되어 view에서 `.distinctUntilChanged()` 처리를 통해 중복 값을 처리하지 않도록 해야한다.

토스트나 얼럿 메세지를 보여줄 때 동일한 텍스트를 요청할 때 마다 보내줘야 할 경우가 있을 것이다. 

하지만 이러한 경우 `.distinctUntilChanged()` 를 사용하게 되면 동일한 메세지를 보낼 수 없을 것이고, 사용하지 않으면 시도때도없이 메세지가 나타날 것이다.

이러한 경우 `@Pulse`를 통해 state에 새로 할당되는 경우에만 이벤트를 발송하도록 할 수 있다.
```swift
struct State {
	var name: String
	@Pulse var message: String?
}
```

```swift
private func bindState(reactor: SampleReactor) {
	reactor.pulse(\.$message)
	    .bind(with: self) { owner, message in
            owner.showAlertMessage.accept(message)
        }
        .disposed(by: disposeBag)
}
```