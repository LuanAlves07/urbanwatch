package UrbanWatch.projetourbano.Controller;
import UrbanWatch.projetourbano.entity.CallHistory;
import UrbanWatch.projetourbano.repository.CallHistoryRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/call-history")
public class CallHistoryController {

    private final CallHistoryRepository callHistoryRepository;

    public CallHistoryController(CallHistoryRepository callHistoryRepository) {
        this.callHistoryRepository = callHistoryRepository;
    }

    @PostMapping
    public CallHistory createHistory(@RequestBody CallHistory history) {
        return callHistoryRepository.save(history);
    }

    @GetMapping
    public List<CallHistory> listHistory() {
        return callHistoryRepository.findAll();
    }
}