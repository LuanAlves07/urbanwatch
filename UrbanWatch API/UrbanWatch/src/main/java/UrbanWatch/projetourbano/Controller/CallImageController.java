package UrbanWatch.projetourbano.Controller;
import UrbanWatch.projetourbano.entity.CallImage;
import UrbanWatch.projetourbano.repository.CallImageRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/call-images")
public class CallImageController {

    private final CallImageRepository callImageRepository;

    public CallImageController(CallImageRepository callImageRepository) {
        this.callImageRepository = callImageRepository;
    }

    @PostMapping
    public CallImage createImage(@RequestBody CallImage image) {
        return callImageRepository.save(image);
    }

    @GetMapping
    public List<CallImage> listImages() {
        return callImageRepository.findAll();
    }
}