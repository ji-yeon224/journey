

Swift Concurrency에서 completion handler나 delegate와 같이 **콜백 기반 비동기 코드를** **async/await 스타일로 변경**하고자 할 때 사용한다.

비동기 메서드 안에서 `continuation`을 등록하고, 비동기 task를 수행 완료한 후 `resume`을 호출하여 작업을 이어서 처리할 수 있다.

resume은 무조건 한 번 호출되어야 한다. resume은 무조건 한 번만 호출되어야 하기 때문에 여러번 호출되면 시스템은 정의되지 않은 동작으로 여기게 된다.

### CheckedContinuation

콜백 기반 코드와 비동기 코드 사이를 안전하게 연결해준다.

위에서 언급한 `resume`메서드가 **여러 번 호출**되면 **크래시**를 발생시킨다. `resume`호출 여부를 체크 과정이 들어가기 때문에 **여러 번 호출되면 즉시 런타임 오류를 발생**시킨다.

```swift
await withCheckedContinuation { continuation in
	continuation.resume(returning: 1)
	continuation.resume(returning: 2) // 🚨 런타임 크래시 (Illegal instruction)
}
```

**사용 예시**

`withCheckedContinuation`

```swift
func getValueAsync() async -> String {
	await withCheckedContinuation { (continuation: CheckedContinuation<String, Never>) in
		legacyFetch { value in
			continuation.resume(returning: value)
		}
	}
}
```

에러 케이스를 처리할 수 있는 `withCheckedThrowingContinuation`

```swift
enum LegacyError: Error { case failed }

func getValueAsync() async throws -> String {
	try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
		legacyFetchWithError { value, error in
			if let error { continuation.resume(throwing: error) }
			else { continuation.resume(returning: value) }
		}
	}
}
```

### UnsafeContinuation

`UnsafeContinuation`은 `resume`이 여러 번 호출되어도 체크하는 로직이 없다. 그렇기 때문에 런타임에 잡아주지 못하여 한 Task가 두 번 깨어나면서 메모리 오염/이상한 값 반환/데드락 등 발생할 수 있다.

**Undefined Behavior**(정의되지 않은 동작) 이기 때문에 어떤 일이 일어날 지 몰라 이상한 버그가 발생할 가능성이 있다.

### CheckedContinuation vs UnsafeContinuation

| **구분**  | **CheckedContinuation**                                  | **UnsafeContinuation**                                 |
| ------- | -------------------------------------------------------- | ------------------------------------------------------ |
| 런타임 안전성 | **안전 검사 있음**: 한 번만 resume 되었는지, 누락되지 않았는지 디버그에서 검증       | **검사 없음**: 실수해도 런타임이 잡아주지 않음                           |
| 디버깅 난이도 | 문제(이중 resume/미호출) 발견이 쉬움                                 | 문제 발견이 어려워 디버깅 비용 큼                                    |
| 권장 용도   | 대부분의 브리지 케이스 (일반 앱 코드)                                   | 성능·제약상 불가피할 때만 (로우레벨/특수 라이브러리)                         |
| 성능 오버헤드 | 소폭 존재(검사 비용)                                             | 가장 얇음                                                  |
| 실수 시 결과 | 크래시/런타임 워닝으로 빨리 인지                                       | 조용한 논리 버그, 메모리/리소스 누수 위험                               |
| API 이름  | withCheckedContinuation, withCheckedThrowingContinuation | withUnsafeContinuation, withUnsafeThrowingContinuation |

`UnsafeContinuation`은 위험성이 크기 때문에 정말 이유가 있는 것이 아니라면 `CheckedContinuation` 사용이 권장된다.

만일 `resume`이 여러 번 호출 될 가능성이 있다면 `continuation`을 `nil`처리하여 한 번만 호출될 수 있도록 막아야 한다.

```swift
guard let continuation = self.continuation else { return }
self.continuation = nil
continuation.resume(returning: value)
```