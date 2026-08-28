import asyncio
from typing import Callable, Awaitable, Any, Dict, List
import logging

logger = logging.getLogger(__name__)

class EventBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable[[Any], Awaitable[None]]]] = {}
        self.queue = asyncio.Queue()
        self.task = None
        
    def subscribe(self, event_type: str, handler: Callable[[Any], Awaitable[None]]):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        
    async def emit(self, event_type: str, payload: Any):
        await self.queue.put((event_type, payload))
        
    async def _process_events(self):
        while True:
            try:
                event_type, payload = await self.queue.get()
                handlers = self.subscribers.get(event_type, [])
                for handler in handlers:
                    try:
                        await handler(payload)
                    except Exception as e:
                        logger.error(f"Error handling event {event_type}: {e}", exc_info=True)
                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Event bus error: {e}")

    def start(self):
        if self.task is None:
            self.task = asyncio.create_task(self._process_events())
            
    async def stop(self):
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

event_bus = EventBus()
