package UrbanWatch.projetourbano.Controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import UrbanWatch.projetourbano.entity.Call;
import UrbanWatch.projetourbano.repository.CallRepository;

@RestController
@RequestMapping("/calls")
public class CallController {
    private final CallRepository callRepository;

    public CallController(CallRepository callRepository) {
        this.callRepository = callRepository;
    }

    @PostMapping
    public Call createCall(@RequestBody Call call) {
        return callRepository.save(call);
    }

    @GetMapping
    public List<Call> listCalls() {
        return callRepository.findAll();
    }
}
